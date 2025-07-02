<?php
session_start();

// Database configuration
$host = 'localhost';
$dbname = 'u148986826_bluefit';
$username = 'u148986826_bluefit';
$password = 'Bananeta1234@';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Track PDF generation
    $visitor_ip = $_SERVER['REMOTE_ADDR'];
    $user_agent = $_SERVER['HTTP_USER_AGENT'];
    $referrer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'Direct';
    $visit_time = date('Y-m-d H:i:s');
    $quote_id = 'bluefit_2025_v2_pdf';
    
    // Get visitor location based on IP
    $location_data = json_decode(@file_get_contents("http://ip-api.com/json/$visitor_ip"), true);
    $country = $location_data['country'] ?? 'Unknown';
    $region = $location_data['regionName'] ?? 'Unknown';
    $city = $location_data['city'] ?? 'Unknown';
    $timezone = $location_data['timezone'] ?? 'Unknown';
    
    // Generate session ID if not exists
    if (!isset($_SESSION['visitor_session'])) {
        $_SESSION['visitor_session'] = uniqid();
    }
    $session_id = $_SESSION['visitor_session'];
    
    // Track PDF generation
    $stmt = $pdo->prepare("INSERT INTO quote_views (quote_id, session_id, visitor_ip, user_agent, referrer, country, region, city, timezone, view_time, quote_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$quote_id, $session_id, $visitor_ip, $user_agent, $referrer, $country, $region, $city, $timezone, $visit_time, 'v2_pdf']);
    
} catch(PDOException $e) {
    error_log("Database error: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <title>Orçamento V2 - Convenção Supervisores Bluefit 2025 - PDF</title>
    <style>
        @page {
            margin: 0.5in;
            size: A4;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.4;
            color: #2c3e50;
            background-color: white;
            font-size: 12px;
        }

        .container {
            max-width: none;
            margin: 0;
            background-color: white;
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            page-break-inside: avoid;
        }

        .logo-section {
            margin-bottom: 15px;
        }

        .logo-section img {
            max-width: 150px;
            max-height: 50px;
            display: block;
        }

        .header h1 {
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: 300;
        }

        .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }

        .quote-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-bottom: 2px solid #e9ecef;
            page-break-inside: avoid;
        }

        .quote-info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 10px;
            color: #6c757d;
            margin-bottom: 3px;
            font-weight: 500;
        }

        .info-value {
            font-size: 12px;
            color: #2c3e50;
            font-weight: 600;
        }

        .content {
            padding: 20px;
        }

        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 16px;
            color: #1e3c72;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-icon {
            width: 20px;
            height: 20px;
            background-color: #1e3c72;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
        }

        .led-specs {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
        }

        .led-specs h3 {
            color: #1e3c72;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .specs-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .spec-item {
            display: flex;
            align-items: baseline;
            gap: 6px;
        }

        .spec-label {
            font-weight: 600;
            color: #495057;
            font-size: 11px;
        }

        .spec-value {
            color: #6c757d;
            font-size: 11px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            page-break-inside: avoid;
            font-size: 11px;
        }

        th {
            background-color: #1e3c72;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 500;
            font-size: 11px;
        }

        td {
            padding: 10px 8px;
            border-bottom: 1px solid #e9ecef;
            font-size: 11px;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        .price {
            font-weight: 600;
            color: #1e3c72;
            white-space: nowrap;
        }

        .total-section {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 20px;
            text-align: center;
            page-break-inside: avoid;
            margin-top: 20px;
        }

        .total-label {
            font-size: 14px;
            margin-bottom: 8px;
            opacity: 0.9;
        }

        .total-amount {
            font-size: 28px;
            font-weight: 700;
        }

        .discount-badge {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 600;
            margin-left: 8px;
        }

        .optional-section {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin-top: 20px;
            page-break-inside: avoid;
        }

        .optional-section h4 {
            color: #856404;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .optional-list {
            list-style: none;
            padding-left: 0;
        }

        .optional-list li {
            padding: 6px 0;
            padding-left: 20px;
            position: relative;
            color: #856404;
            font-size: 11px;
        }

        .optional-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            font-weight: bold;
        }

        .notes {
            background-color: #e7f3ff;
            border-left: 4px solid #1e3c72;
            padding: 15px;
            margin-top: 20px;
            border-radius: 0 6px 6px 0;
            page-break-inside: avoid;
        }

        .notes h4 {
            color: #1e3c72;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .notes p {
            color: #495057;
            margin-bottom: 6px;
            font-size: 11px;
        }

        /* Hide elements not needed in PDF */
        script {
            display: none;
        }
        
        .print-only {
            display: block;
        }
        
        .no-print {
            display: none;
        }
    </style>
    <script>
        window.onload = function() {
            // Auto-print when page loads
            window.print();
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-section">
                <img src="img/on+av_logo_v2.png" alt="On+Av Logo">
            </div>
            <h1>Orçamento de Produção - Versão 2</h1>
            <p class="subtitle">Live Convenção Supervisores Bluefit 2025</p>
        </div>

        <div class="quote-info">
            <div class="quote-info-grid">
                <div class="info-item">
                    <span class="info-label">Data do Evento</span>
                    <span class="info-value">19 de setembro de 2025</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Horário</span>
                    <span class="info-value">08h às 13h</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Local</span>
                    <span class="info-value">R. Plácido Vieira, 43 - Santo Amaro, São Paulo - SP, 04755-000</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Formato</span>
                    <span class="info-value">Híbrido (Presencial + Streaming)</span>
                </div>
            </div>
        </div>

        <div class="content">
            <section class="section">
                <h2 class="section-title">
                    <span class="section-icon">▶</span>
                    Configuração do LED
                </h2>
                
                <div class="led-specs">
                    <h3>LED Principal</h3>
                    <div class="specs-grid">
                        <div class="spec-item">
                            <span class="spec-label">Dimensões:</span>
                            <span class="spec-value">10m × 4m</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Curvatura:</span>
                            <span class="spec-value">0°</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Módulos:</span>
                            <span class="spec-value">160 unidades</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Pixels (L×A):</span>
                            <span class="spec-value">3.840 × 1.536 (5.898.240 total)</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Potência Máx./Média:</span>
                            <span class="spec-value">27.600 W / 9.200 W</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Peso:</span>
                            <span class="spec-value">1.200 kg</span>
                        </div>
                    </div>
                </div>

                <h3>Serviços Incluídos - Valores Diários</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qtd</th>
                            <th style="text-align: right;">Preço Unit. (Diária)</th>
                            <th style="text-align: right;">Subtotal (Diária)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Módulos LED (160 Unidades)</td>
                            <td style="text-align: center;">160</td>
                            <td style="text-align: right;" class="price">R$ 85,00</td>
                            <td style="text-align: right;" class="price">R$ 13.600,00</td>
                        </tr>
                        <tr>
                            <td>Processadores MX-40 Pro</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;" class="price">R$ 1.890,00</td>
                            <td style="text-align: right;" class="price">R$ 1.890,00</td>
                        </tr>
                        <tr>
                            <td>Servidor</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;" class="price">R$ 5.000,00</td>
                            <td style="text-align: right;" class="price">R$ 5.000,00</td>
                        </tr>
                        <tr>
                            <td>Equipe especializada</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;" class="price">R$ 5.000,00</td>
                            <td style="text-align: right;" class="price">R$ 5.000,00</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="section">
                <h2 class="section-title">
                    <span class="section-icon">🏢</span>
                    Espaço para Eventos
                </h2>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Descrição</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Estúdio Principal</td>
                            <td style="text-align: center;">32m × 14m <span class="discount-badge">100% DESC</span></td>
                            <td style="text-align: right;" class="price">R$ 0,00</td>
                        </tr>
                        <tr>
                            <td>Ambiente para Coffee Break</td>
                            <td style="text-align: center;">Incluído</td>
                            <td style="text-align: right;" class="price">-</td>
                        </tr>
                        <tr>
                            <td>Camarim</td>
                            <td style="text-align: center;">Incluído</td>
                            <td style="text-align: right;" class="price">-</td>
                        </tr>
                        <tr>
                            <td>Estacionamento</td>
                            <td style="text-align: center;">Aprox. 20 carros</td>
                            <td style="text-align: right;" class="price">Incluído</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="section">
                <h2 class="section-title">
                    <span class="section-icon">🎥</span>
                    Produção e Transmissão
                </h2>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qtd</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Câmeras Sony PMW-EX3 com operadores</td>
                            <td style="text-align: center;">2</td>
                            <td style="text-align: right;" class="price">R$ 13.000,00</td>
                        </tr>
                        <tr>
                            <td>DTV</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;" class="price">Incluído</td>
                        </tr>
                        <tr>
                            <td>Switcher de corte</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;" class="price">Incluído</td>
                        </tr>
                        <tr>
                            <td>Streaming + Internet fibra 1GB</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;" class="price">Incluído</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <div class="optional-section">
                <h4>
                    <span>⭐</span>
                    Serviços Opcionais Disponíveis
                </h4>
                <ul class="optional-list">
                    <li>Conteúdo 2D personalizado</li>
                    <li>Cenário Virtual 3D</li>
                    <li>Realidade Aumentada</li>
                    <li>Portal do evento (website com design e funcionalidades para eventos online)</li>
                </ul>
            </div>

            <div class="notes">
                <h4>Observações Importantes</h4>
                <p>• Orçamento válido por 30 dias a partir da data de emissão</p>
                <p>• Valores sujeitos a alteração conforme disponibilidade de equipamentos</p>
                <p>• Inclui montagem, desmontagem e operação técnica especializada</p>
                <p>• Gerado em: <?php echo date('d/m/Y H:i'); ?></p>
            </div>
        </div>

        <div class="total-section">
            <div class="total-label">Valor Total Estimado (1 dia)</div>
            <div class="total-amount">R$ 38.490,00</div>
        </div>
    </div>
</body>
</html>