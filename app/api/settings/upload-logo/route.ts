import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Use service role key to bypass RLS for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    await requireAdmin()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const oldLogoPath = formData.get('oldLogoPath') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Delete old logo if exists
    if (oldLogoPath) {
      await supabase.storage
        .from('site-assets')
        .remove([oldLogoPath])
    }

    // Upload new logo
    // Note: File is already compressed to WebP format (<100KB) by the client before upload
    const fileName = `logo-${Date.now()}.webp`
    const filePath = `logo/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(filePath, file, {
        contentType: 'image/webp',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload logo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      path: filePath
    })
  } catch (error: any) {
    console.error('Error uploading logo:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

