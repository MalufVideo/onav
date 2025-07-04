import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { proposalId, createdByUserId, currentUserRole } = await req.json()

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch the proposal details
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (proposalError) {
      throw new Error(`Failed to fetch proposal: ${proposalError.message}`)
    }

    // Fetch user profile for the creator
    const { data: creatorProfile, error: creatorError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', createdByUserId)
      .single()

    if (creatorError) {
      throw new Error(`Failed to fetch creator profile: ${creatorError.message}`)
    }

    // Determine recipient based on rules:
    // - If client submits proposal themselves → client gets email
    // - If sales rep creates proposal for client → sales rep gets email (NOT the client)
    let recipientEmail = ''
    let recipientName = ''
    let recipientType = ''

    if (currentUserRole === 'sales_rep') {
      // Sales rep created the proposal - send email to sales rep
      recipientEmail = creatorProfile.email || proposal.client_email
      recipientName = creatorProfile.full_name || proposal.sales_rep_name
      recipientType = 'sales_rep'
    } else {
      // Client created the proposal themselves - send email to client
      recipientEmail = proposal.client_email
      recipientName = proposal.client_name
      recipientType = 'client'
    }

    if (!recipientEmail) {
      throw new Error('No valid recipient email found')
    }

    // Format the shooting dates for display
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'Não definida'
      try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('pt-BR')
      } catch {
        return dateStr
      }
    }

    const shootingDatesText = proposal.shooting_dates_start && proposal.shooting_dates_end 
      ? `${formatDate(proposal.shooting_dates_start)} a ${formatDate(proposal.shooting_dates_end)}`
      : proposal.shooting_dates_start 
        ? formatDate(proposal.shooting_dates_start)
        : 'Datas não definidas'

    // Create email content
    const subject = `Nova Proposta LED: ${proposal.project_name}`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .section { margin-bottom: 20px; }
          .label { font-weight: bold; color: #4CAF50; }
          .value { margin-left: 10px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nova Proposta de LED Wall</h1>
          </div>
          <div class="content">
            <div class="section">
              <p><span class="label">Projeto:</span><span class="value">${proposal.project_name}</span></p>
              <p><span class="label">Cliente:</span><span class="value">${proposal.client_name}</span></p>
              ${proposal.client_company ? `<p><span class="label">Empresa:</span><span class="value">${proposal.client_company}</span></p>` : ''}
              <p><span class="label">E-mail:</span><span class="value">${proposal.client_email}</span></p>
              ${proposal.client_phone ? `<p><span class="label">Telefone:</span><span class="value">${proposal.client_phone}</span></p>` : ''}
            </div>
            
            <div class="section">
              <p><span class="label">Datas da Filmagem:</span><span class="value">${shootingDatesText}</span></p>
              <p><span class="label">Período:</span><span class="value">${proposal.days_count} dia(s)</span></p>
            </div>
            
            <div class="section">
              <p><span class="label">Tipo de Produção:</span><span class="value">${proposal.selected_pod_type === '3d' ? 'VP 3D (Unreal 5 ou 2.5D)' : 'VP 2D (Plates ou Camera Car)'}</span></p>
              <p><span class="label">LED Principal:</span><span class="value">${proposal.led_principal_width}m × ${proposal.led_principal_height}m (${proposal.led_principal_modules} módulos)</span></p>
              ${proposal.led_teto_modules > 0 ? `<p><span class="label">LED Teto:</span><span class="value">${proposal.led_teto_width}m × ${proposal.led_teto_height}m (${proposal.led_teto_modules} módulos)</span></p>` : ''}
            </div>
            
            <div class="section">
              <p><span class="label">Valor Total:</span><span class="value" style="font-size: 18px; color: #4CAF50; font-weight: bold;">${proposal.total_price}</span></p>
              ${proposal.days_count > 1 ? `<p><span class="label">Valor Diário:</span><span class="value">R$ ${proposal.daily_rate?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>` : ''}
            </div>
            
            ${currentUserRole === 'sales_rep' ? `
            <div class="section" style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
              <p><strong>Nota para o Vendedor:</strong></p>
              <p>Esta proposta foi criada por você para o cliente. O cliente NÃO recebeu uma cópia deste e-mail. Você pode decidir se deseja encaminhar estas informações para o cliente via e-mail corporativo.</p>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Este e-mail foi gerado automaticamente pelo sistema de propostas ON+AV.</p>
            <p>Para dúvidas, entre em contato conosco.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const textContent = `
Nova Proposta de LED Wall

Projeto: ${proposal.project_name}
Cliente: ${proposal.client_name}
${proposal.client_company ? `Empresa: ${proposal.client_company}\n` : ''}E-mail: ${proposal.client_email}
${proposal.client_phone ? `Telefone: ${proposal.client_phone}\n` : ''}

Datas da Filmagem: ${shootingDatesText}
Período: ${proposal.days_count} dia(s)

Tipo de Produção: ${proposal.selected_pod_type === '3d' ? 'VP 3D (Unreal 5 ou 2.5D)' : 'VP 2D (Plates ou Camera Car)'}
LED Principal: ${proposal.led_principal_width}m × ${proposal.led_principal_height}m (${proposal.led_principal_modules} módulos)
${proposal.led_teto_modules > 0 ? `LED Teto: ${proposal.led_teto_width}m × ${proposal.led_teto_height}m (${proposal.led_teto_modules} módulos)\n` : ''}

Valor Total: ${proposal.total_price}
${proposal.days_count > 1 ? `Valor Diário: R$ ${proposal.daily_rate?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : ''}

${currentUserRole === 'sales_rep' ? `
NOTA PARA O VENDEDOR:
Esta proposta foi criada por você para o cliente. O cliente NÃO recebeu uma cópia deste e-mail. Você pode decidir se deseja encaminhar estas informações para o cliente via e-mail corporativo.
` : ''}

---
Este e-mail foi gerado automaticamente pelo sistema de propostas ON+AV.
    `

    // Send email using Resend
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'propostas@onav.com.br',
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${emailResponse.status} ${errorText}`)
    }

    const emailResult = await emailResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipient: recipientEmail,
        recipientType: recipientType,
        emailId: emailResult.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error sending quote notification:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})