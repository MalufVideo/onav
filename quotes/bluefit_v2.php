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
    
    // Track visitor data
    $visitor_ip = $_SERVER['REMOTE_ADDR'];
    $user_agent = $_SERVER['HTTP_USER_AGENT'];
    $referrer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'Direct';
    $visit_time = date('Y-m-d H:i:s');
    $quote_id = 'bluefit_2025_v2';
    
    // Get visitor location based on IP (using a simple geolocation service)
    $location_data = json_decode(file_get_contents("http://ip-api.com/json/$visitor_ip"), true);
    $country = $location_data['country'] ?? 'Unknown';
    $region = $location_data['regionName'] ?? 'Unknown';
    $city = $location_data['city'] ?? 'Unknown';
    $timezone = $location_data['timezone'] ?? 'Unknown';
    
    // Generate session ID if not exists
    if (!isset($_SESSION['visitor_session'])) {
        $_SESSION['visitor_session'] = uniqid();
    }
    $session_id = $_SESSION['visitor_session'];
    
    // Track page view with version
    $stmt = $pdo->prepare("INSERT INTO quote_views (quote_id, session_id, visitor_ip, user_agent, referrer, country, region, city, timezone, view_time, quote_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$quote_id, $session_id, $visitor_ip, $user_agent, $referrer, $country, $region, $city, $timezone, $visit_time, 'v2']);
    
    // Track time on page with JavaScript
    echo "<script>
        let startTime = Date.now();
        let interactions = 0;
        let scrollDepth = 0;
        
        // Track scroll depth
        window.addEventListener('scroll', function() {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            let docHeight = document.documentElement.scrollHeight - window.innerHeight;
            let scrollPercent = Math.round((scrollTop / docHeight) * 100);
            if (scrollPercent > scrollDepth) {
                scrollDepth = scrollPercent;
            }
        });
        
        // Track interactions
        document.addEventListener('click', function() {
            interactions++;
        });
        
        // Send data when page unloads
        window.addEventListener('beforeunload', function() {
            let timeSpent = Math.round((Date.now() - startTime) / 1000);
            
            // Use fetch with keepalive to ensure data is sent
            fetch('track_interaction.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: '$session_id',
                    time_spent: timeSpent,
                    interactions: interactions,
                    scroll_depth: scrollDepth
                }),
                keepalive: true
            });
        });
        
        // Also send data every 30 seconds for active sessions
        setInterval(function() {
            let timeSpent = Math.round((Date.now() - startTime) / 1000);
            
            fetch('track_interaction.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: '$session_id',
                    time_spent: timeSpent,
                    interactions: interactions,
                    scroll_depth: scrollDepth,
                    is_active: true
                })
            });
        }, 30000);
    </script>";
    
} catch(PDOException $e) {
    // Log error but don't show to user
    error_log("Database error: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet">
    <title>Orçamento V2 - Convenção Supervisores Bluefit 2025</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background-color: #f8f9fa;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            transform: rotate(45deg);
        }

        .logo-placeholder {
            width: 200px;
            height: 80px;
            background-color: rgba(255,255,255,0.2);
            border: 2px dashed rgba(255,255,255,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 14px;
            border-radius: 8px;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
            letter-spacing: -1px;
        }

        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            font-weight: 300;
        }

        .quote-info {
            background-color: #f8f9fa;
            padding: 30px 40px;
            border-bottom: 3px solid #e9ecef;
        }

        .quote-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 5px;
            font-weight: 500;
        }

        .info-value {
            font-size: 1.1em;
            color: #2c3e50;
            font-weight: 600;
        }

        .content {
            padding: 40px;
        }

        .section {
            margin-bottom: 40px;
        }

        .section-title {
            font-size: 1.8em;
            color: #1e3c72;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-icon {
            width: 30px;
            height: 30px;
            background-color: #1e3c72;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
        }

        .led-specs {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .led-specs h3 {
            color: #1e3c72;
            margin-bottom: 15px;
            font-size: 1.3em;
        }

        .specs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .spec-item {
            display: flex;
            align-items: baseline;
            gap: 8px;
        }

        .spec-label {
            font-weight: 600;
            color: #495057;
        }

        .spec-value {
            color: #6c757d;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border-radius: 8px;
            overflow: hidden;
        }

        th {
            background-color: #1e3c72;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 500;
        }

        td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
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
            padding: 30px 40px;
            margin: 40px -40px -40px -40px;
            text-align: center;
        }

        .total-label {
            font-size: 1.2em;
            margin-bottom: 10px;
            opacity: 0.9;
        }

        .total-amount {
            font-size: 3em;
            font-weight: 700;
            letter-spacing: -1px;
        }

        .discount-badge {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            margin-left: 10px;
        }

        .optional-section {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }

        .optional-section h4 {
            color: #856404;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .optional-list {
            list-style: none;
            padding-left: 0;
        }

        .optional-list li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
            color: #856404;
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
            padding: 20px;
            margin-top: 30px;
            border-radius: 0 8px 8px 0;
        }

        .notes h4 {
            color: #1e3c72;
            margin-bottom: 10px;
        }

        .notes p {
            color: #495057;
            margin-bottom: 8px;
        }

        @media print {
            body {
                background-color: white;
            }
            .container {
                box-shadow: none;
            }
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2em;
            }
            .total-amount {
                font-size: 2.5em;
            }
            table {
                font-size: 0.9em;
            }
            th, td {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-placeholder" style="border:none; background:none; justify-content:left;">
  <img src="img/on+av_logo_v2.png" alt="On+Av Logo" style="max-width:180px; max-height:60px; display:block;">
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

            

            <section class="section">
                <h2 class="section-title">
                    <span class="section-icon">📷</span>
                    Galeria do Estúdio
                </h2>
                <p style="margin-bottom: 20px;">Conheça nosso estúdio de produção virtual</p>
                
                <style>
                    .gallery-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin-bottom: 30px;
                    }
                    .gallery-item {
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                        position: relative;
                        cursor: pointer;
                    }
                    .gallery-item img {
                        width: 100%;
                        height: 120px;
                        object-fit: cover;
                        display: block;
                        transition: transform 0.3s ease;
                    }
                    .gallery-item:hover img {
                        transform: scale(1.03);
                    }
                    .play-icon {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-size: 40px;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    }
                    /* Lightbox styles */
                    .lightbox {
                        display: none;
                        position: fixed;
                        z-index: 1000;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0,0,0,0.85);
                        justify-content: center;
                        align-items: center;
                    }
                    .lightbox.active {
                        display: flex;
                    }
                    .lightbox-content {
                        max-width: 90%;
                        max-height: 90%;
                    }
                    .lightbox-content img {
                        max-width: 100%;
                        max-height: 80vh;
                        border-radius: 4px;
                    }
                    .lightbox-content video {
                        max-width: 100%;
                        max-height: 80vh;
                    }
                    .close-lightbox {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        color: white;
                        font-size: 30px;
                        cursor: pointer;
                        z-index: 1001;
                    }
                </style>
                
                <div class="gallery-grid">
                    <div class="gallery-item" onclick="openLightbox('img/estudio.webp', 'image', 'Visão geral do estúdio')">
                        <img src="img/estudio.webp" alt="Visão geral do estúdio">
                    </div>
                    <div class="gallery-item" onclick="openLightbox('img/led_curvo.webp', 'image', 'Detalhe do LED')">
                        <img src="img/led_curvo.webp" alt="Detalhe do LED">
                    </div>
                    <div class="gallery-item" onclick="openLightbox('img/camarim.webp', 'image', 'Área de camarim')">
                        <img src="img/camarim.webp" alt="Área de camarim">
                    </div>
                    <div class="gallery-item" onclick="openLightbox('img/medidas_estudio.mp4', 'video', 'Medidas do estúdio')">
                        <img src="img/medidas_estudio_thumb.png" alt="Medidas do estúdio">
                        <div class="play-icon">▶</div>
                    </div>
                </div>
                
                <div id="lightbox" class="lightbox" onclick="closeLightboxOnOutsideClick(event)">
                    <div class="close-lightbox" onclick="closeLightbox()">×</div>
                    <div id="lightbox-content" class="lightbox-content"></div>
                </div>
                
                <script>
                    function openLightbox(src, type, title) {
                        const lightbox = document.getElementById('lightbox');
                        const content = document.getElementById('lightbox-content');
                        content.innerHTML = '';
                        
                        // Track gallery interaction
                        trackGalleryInteraction('opened', title || src, type);
                        
                        if (type === 'image') {
                            const img = document.createElement('img');
                            img.src = src;
                            img.onload = function() {
                                trackGalleryInteraction('loaded', title || src, type);
                            };
                            content.appendChild(img);
                        } else if (type === 'video') {
                            const video = document.createElement('video');
                            video.src = src;
                            video.controls = true;
                            video.autoplay = true;
                            video.addEventListener('play', function() {
                                trackGalleryInteraction('played', title || src, type);
                            });
                            video.addEventListener('pause', function() {
                                trackGalleryInteraction('paused', title || src, type);
                            });
                            video.addEventListener('ended', function() {
                                trackGalleryInteraction('finished', title || src, type);
                            });
                            content.appendChild(video);
                        }
                        
                        lightbox.classList.add('active');
                    }
                    
                    function closeLightbox() {
                        const lightbox = document.getElementById('lightbox');
                        lightbox.classList.remove('active');
                        document.getElementById('lightbox-content').innerHTML = '';
                        
                        // Track gallery close
                        trackGalleryInteraction('closed', 'lightbox', 'close');
                    }
                    
                    function closeLightboxOnOutsideClick(event) {
                        if (event.target.id === 'lightbox') {
                            closeLightbox();
                        }
                    }
                    
                    function trackGalleryInteraction(action, item, type) {
                        const data = {
                            session_id: '$session_id',
                            action: action,
                            item: item,
                            type: type,
                            timestamp: new Date().toISOString()
                        };
                        
                        console.log('Tracking gallery interaction:', data);
                        
                        fetch('debug_gallery.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(data)
                        })
                        .then(response => response.json())
                        .then(result => {
                            console.log('Tracking response:', result);
                        })
                        .catch(error => {
                            console.error('Tracking error:', error);
                        });
                    }
                </script>
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
        </div>

        <div class="total-section">
            <div class="total-label">Valor Total Estimado (1 dia)</div>
            <div class="total-amount">R$ 38.490,00</div>
        </div>
    </div>
</body>
</html>
