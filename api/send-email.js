// File: api/send-email.js
import { Resend } from 'resend';

// IMPORTANT: In a real deployment, use an environment variable for your API key.
// const resend = new Resend(process.env.RESEND_API_KEY);
// For this example, we're using the key you provided, but replace this with process.env.RESEND_API_KEY in production.
const resend = new Resend('re_jMkwd7zt_FihowYjXxNzcDcek6RsfkNpp');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Ensure req.body is parsed. If not, you might need a middleware
      // like `body-parser` or rely on your serverless platform's parsing.
      // For Vercel/Next.js, req.body is automatically parsed for JSON.
      // For Netlify Functions, you might need to parse it: const body = JSON.parse(req.body);
      const {
        name,
        email,
        phone,
        company,
        project,
        'equipment-interest': equipmentInterest // Accessing property with hyphen
      } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      if (!name || !email || !phone || !project) {
        return res.status(400).json({ message: 'Missing required fields: name, email, phone, and project are required.' });
      }

      const fromEmail = 'On+Av Contato <contato@onav.com.br>'; // Ensure contato@onav.com.br is verified in Resend
      const toEmail = 'nelsonhdvideo@gmail.com'; // Your testing email address

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        subject: `On+Av Site: Nova Mensagem de Contato de ${name}`,
        html: `
          <p>Você recebeu uma nova mensagem do formulário de contato do site On+Av:</p>
          <hr>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefone:</strong> ${phone}</p>
          <p><strong>Empresa:</strong> ${company || 'Não informado'}</p>
          <p><strong>Sobre o projeto:</strong></p>
          <p>${project.replace(/\n/g, '<br>')}</p>
          <p><strong>Equipamentos de interesse:</strong> ${equipmentInterest || 'Não selecionado'}</p>
          <hr>
          <p><em>Enviado via formulário do site.</em></p>
        `,
      });

      if (error) {
        console.error('Resend API Error:', error);
        return res.status(400).json({ message: 'Erro ao enviar o email.', details: error.message });
      }

      return res.status(200).json({ message: 'Email enviado com sucesso!' });

    } catch (error) {
      console.error('Server Error:', error);
      // Check if error is due to JSON parsing
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
         return res.status(400).json({ message: 'Erro ao processar os dados do formulário. Verifique o formato JSON.' });
      }
      return res.status(500).json({ message: 'Erro interno do servidor.', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
