import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { aiProvider } from '../../services/ai';
import pdfParse from 'pdf-parse';

export async function listDocuments(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { document_type, search } = req.query;

    let query = supabaseAdmin
      .from('documents')
      .select('*, employees(first_name, last_name, employee_id), document_extractions(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (document_type && document_type !== 'all') {
      query = query.eq('document_type', document_type);
    }
    if (search) {
      query = query.or(`file_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ documents: data || [] });
  } catch (err: any) {
    console.error('listDocuments error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function uploadAndProcessDocument(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileExt = file.originalname.split('.').pop() || 'pdf';
    const storagePath = `${orgId}/${Date.now()}-${file.originalname}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload notice (local or storage config):', uploadError.message);
    }

    // 2. Extract Raw Text (PDF parser or text fallback)
    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text || '';
      } catch (pdfErr) {
        console.warn('PDF parse failed, using filename heuristic:', pdfErr);
        extractedText = `Document: ${file.originalname}`;
      }
    } else {
      extractedText = `Image document: ${file.originalname}`;
    }

    // 3. AI Document Classification
    const classification = await aiProvider.classifyDocument(extractedText, file.originalname);

    // 4. Insert Document Record
    const { data: docRecord, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        organization_id: orgId,
        uploaded_by: req.user?.id,
        file_name: file.originalname,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
        storage_path: storagePath,
        document_type: classification.documentType,
        processing_status: 'completed',
        verification_status: 'unverified',
      })
      .select()
      .single();

    if (docError || !docRecord) throw docError;

    // 5. AI Structured Extraction
    let structuredData: any = {};
    if (classification.documentType === 'invoice') {
      structuredData = await aiProvider.extractInvoiceData(extractedText);
    } else if (classification.documentType === 'contract') {
      structuredData = await aiProvider.extractContractData(extractedText);
    } else {
      structuredData = { summary: classification.explanation };
    }

    // 6. Save Extraction Record
    const { data: extractionRecord, error: extractionError } = await supabaseAdmin
      .from('document_extractions')
      .insert({
        document_id: docRecord.id,
        organization_id: orgId,
        raw_text: extractedText,
        extracted_data: structuredData,
        confidence_score: classification.confidence,
        ai_provider: 'gemini',
        ai_model_used: 'gemini-1.5-flash',
        extracted_fields: structuredData,
      })
      .select()
      .single();

    if (extractionError) console.error('Error saving extraction:', extractionError);

    res.status(201).json({
      document: docRecord,
      extraction: extractionRecord || { extracted_data: structuredData },
    });
  } catch (err: any) {
    console.error('uploadAndProcessDocument error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getDocumentSignedUrl(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 900); // 15 min expiry

    if (signedError) {
      return res.json({ url: `https://koojwtjzcyktjxfojrjc.supabase.co/storage/v1/object/public/documents/${doc.storage_path}` });
    }

    res.json({ signedUrl: signedData?.signedUrl });
  } catch (err: any) {
    console.error('getDocumentSignedUrl error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function queryDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { question } = req.body;
    const orgId = req.organizationId;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const { data: extraction, error } = await supabaseAdmin
      .from('document_extractions')
      .select('raw_text, extracted_data')
      .eq('document_id', id)
      .eq('organization_id', orgId)
      .single();

    const docContent = extraction?.raw_text || JSON.stringify(extraction?.extracted_data || {});
    const answer = await aiProvider.queryDocument(docContent, question);

    res.json({ answer });
  } catch (err: any) {
    console.error('queryDocument error:', err);
    res.status(500).json({ error: err.message });
  }
}
