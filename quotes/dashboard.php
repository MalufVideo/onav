<?php
session_start();

// Authentication
$dashboard_username = 'onav';
$dashboard_password = 'Bananeta1234@';

// Check if user is logged in
if (!isset($_SESSION['dashboard_logged_in']) || $_SESSION['dashboard_logged_in'] !== true) {
    // Handle login form submission
    if ($_POST['username'] ?? '' === $dashboard_username && $_POST['password'] ?? '' === $dashboard_password) {
        $_SESSION['dashboard_logged_in'] = true;
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }
    
    // Show login form
    ?>
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet">
        <title>Login - Dashboard</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .login-container {
                background: white;
                padding: 3rem;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                width: 100%;
                max-width: 400px;
            }
            
            .login-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .login-header h1 {
                color: #1e3c72;
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .login-header p {
                color: #6c757d;
                font-size: 1rem;
            }
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: #495057;
                font-weight: 500;
            }
            
            .form-group input {
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e9ecef;
                border-radius: 6px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
            }
            
            .form-group input:focus {
                outline: none;
                border-color: #1e3c72;
                box-shadow: 0 0 0 3px rgba(30, 60, 114, 0.1);
            }
            
            .login-btn {
                width: 100%;
                padding: 0.75rem;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            
            .login-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(30, 60, 114, 0.3);
            }
            
            .error-message {
                background-color: #f8d7da;
                color: #721c24;
                padding: 0.75rem;
                border-radius: 6px;
                margin-bottom: 1rem;
                border: 1px solid #f5c6cb;
            }
            
            .security-info {
                margin-top: 2rem;
                padding-top: 1.5rem;
                border-top: 1px solid #e9ecef;
                text-align: center;
            }
            
            .security-info p {
                color: #6c757d;
                font-size: 0.85rem;
                margin-bottom: 0.5rem;
            }
            
            .security-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background-color: #d4edda;
                color: #155724;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 500;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="login-header">
                <h1>🔐 Dashboard</h1>
                <p>Acesso restrito - Análise de Orçamentos</p>
            </div>
            
            <?php if (isset($_POST['username']) || isset($_POST['password'])): ?>
            <div class="error-message">
                ❌ Usuário ou senha incorretos. Tente novamente.
            </div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label for="username">Usuário:</label>
                    <input type="text" id="username" name="username" required autocomplete="username">
                </div>
                
                <div class="form-group">
                    <label for="password">Senha:</label>
                    <input type="password" id="password" name="password" required autocomplete="current-password">
                </div>
                
                <button type="submit" class="login-btn">
                    Entrar no Dashboard
                </button>
            </form>
            
            <div class="security-info">
                <p>Sistema de monitoramento seguro</p>
                <div class="security-badge">
                    🛡️ Sessão protegida
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Add logout functionality
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// Database configuration
$host = 'localhost';
$dbname = 'u148986826_bluefit';
$username = 'u148986826_bluefit';
$password = 'Bananeta1234@';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Get quote analytics data
$stmt = $pdo->query("SELECT * FROM quote_analytics");
$quote_analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get recent views
$stmt = $pdo->query("SELECT * FROM quote_views ORDER BY view_time DESC LIMIT 20");
$recent_views = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get geographic analytics
$stmt = $pdo->query("SELECT * FROM geographic_analytics ORDER BY unique_visitors DESC LIMIT 10");
$geographic_analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get time analytics for the last 7 days
$stmt = $pdo->query("SELECT * FROM time_analytics WHERE view_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY view_date DESC, view_hour DESC");
$time_analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get device and browser analytics
$stmt = $pdo->query("
    SELECT 
        quote_id,
        CASE 
            WHEN user_agent LIKE '%Mobile%' OR user_agent LIKE '%Android%' THEN 'Mobile'
            WHEN user_agent LIKE '%Tablet%' OR user_agent LIKE '%iPad%' THEN 'Tablet'
            ELSE 'Desktop'
        END as device_type,
        CASE
            WHEN user_agent LIKE '%Chrome%' THEN 'Chrome'
            WHEN user_agent LIKE '%Firefox%' THEN 'Firefox'
            WHEN user_agent LIKE '%Safari%' AND user_agent NOT LIKE '%Chrome%' THEN 'Safari'
            WHEN user_agent LIKE '%Edge%' THEN 'Edge'
            ELSE 'Other'
        END as browser,
        COUNT(DISTINCT session_id) as unique_visitors,
        AVG(time_spent) as avg_time_spent
    FROM quote_views 
    GROUP BY quote_id, device_type, browser
    ORDER BY unique_visitors DESC
");
$device_analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get engagement metrics
$stmt = $pdo->query("
    SELECT 
        quote_id,
        COUNT(DISTINCT session_id) as total_unique_visitors,
        COUNT(*) as total_page_views,
        AVG(time_spent) as avg_time_spent,
        AVG(scroll_depth) as avg_scroll_depth,
        AVG(interactions) as avg_interactions,
        SUM(CASE WHEN time_spent > 30 THEN 1 ELSE 0 END) as engaged_sessions,
        SUM(CASE WHEN scroll_depth > 50 THEN 1 ELSE 0 END) as deep_scroll_sessions,
        SUM(CASE WHEN interactions > 0 THEN 1 ELSE 0 END) as interactive_sessions
    FROM quote_views 
    GROUP BY quote_id
");
$engagement_metrics = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get hourly traffic pattern
$stmt = $pdo->query("
    SELECT 
        HOUR(view_time) as hour,
        COUNT(DISTINCT session_id) as unique_visitors,
        COUNT(*) as total_views
    FROM quote_views 
    WHERE view_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY HOUR(view_time)
    ORDER BY hour
");
$hourly_traffic = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get gallery analytics
$stmt = $pdo->query("
    SELECT 
        item,
        type,
        action,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as unique_users
    FROM gallery_interactions 
    GROUP BY item, type, action
    ORDER BY item, action
");
$gallery_analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get gallery summary
$stmt = $pdo->query("
    SELECT 
        COUNT(DISTINCT session_id) as users_viewed_gallery,
        COUNT(DISTINCT CASE WHEN action = 'opened' THEN session_id END) as users_opened_items,
        COUNT(DISTINCT CASE WHEN action = 'played' THEN session_id END) as users_played_videos,
        AVG(CASE WHEN action = 'opened' THEN 1 ELSE 0 END) as avg_items_per_user
    FROM gallery_interactions
");
$gallery_summary = $stmt->fetch(PDO::FETCH_ASSOC);

// Get recent gallery activity
$stmt = $pdo->query("
    SELECT 
        gi.*,
        qv.visitor_ip,
        qv.city,
        qv.country
    FROM gallery_interactions gi
    LEFT JOIN quote_views qv ON gi.session_id = qv.session_id
    ORDER BY gi.interaction_time DESC
    LIMIT 20
");
$recent_gallery_activity = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet">
    <title>Dashboard - Análise de Orçamentos</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f5f6fa;
            color: #2c3e50;
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 300;
        }

        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e1e8ed;
        }

        .card h3 {
            color: #1e3c72;
            margin-bottom: 1rem;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
        }

        .metric {
            text-align: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1e3c72;
            display: block;
        }

        .metric-label {
            font-size: 0.9rem;
            color: #6c757d;
            margin-top: 0.5rem;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }

        .table-container {
            overflow-x: auto;
            margin-top: 1rem;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        th {
            background-color: #1e3c72;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 500;
            font-size: 0.9rem;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #e9ecef;
            font-size: 0.9rem;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .status-sent { background-color: #17a2b8; color: white; }
        .status-viewed { background-color: #28a745; color: white; }
        .status-draft { background-color: #6c757d; color: white; }
        .status-opened { background-color: #007bff; color: white; }
        .status-loaded { background-color: #28a745; color: white; }
        .status-played { background-color: #28a745; color: white; }
        .status-paused { background-color: #ffc107; color: black; }
        .status-finished { background-color: #17a2b8; color: white; }
        .status-closed { background-color: #6c757d; color: white; }

        .progress-bar {
            background-color: #e9ecef;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            margin: 0.5rem 0;
        }

        .progress-fill {
            background: linear-gradient(90deg, #1e3c72, #2a5298);
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }

        .filter-section {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .filter-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            align-items: end;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group label {
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #495057;
        }

        .form-group select,
        .form-group input {
            padding: 0.5rem;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(30, 60, 114, 0.3);
        }

        .live-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .live-dot {
            width: 8px;
            height: 8px;
            background-color: #28a745;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .engagement-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .engagement-high { color: #28a745; }
        .engagement-medium { color: #ffc107; }
        .engagement-low { color: #dc3545; }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            
            .metric-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
                <h1>📊 Dashboard de Análise de Orçamentos</h1>
                <p>Acompanhe o desempenho e engajamento dos seus orçamentos em tempo real</p>
            </div>
            <div style="text-align: right;">
                <p style="margin-bottom: 0.5rem; opacity: 0.8; font-size: 0.9rem;">👤 Logado como: <strong>onav</strong></p>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <a href="reset_data.php" style="background: rgba(220, 53, 69, 0.9); color: white; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.3); transition: all 0.3s ease;" onclick="return confirm('Você quer resetar todos os dados de teste?')">
                        🗑️ Reset
                    </a>
                    <a href="?logout=1" style="background: rgba(255,255,255,0.2); color: white; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.3); transition: all 0.3s ease;">
                        🚪 Sair
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Live Activity Indicator -->
        <div class="card">
            <div class="live-indicator">
                <div class="live-dot"></div>
                <span><strong>Dashboard Ativo:</strong> Dados atualizados em tempo real</span>
            </div>
        </div>

        <!-- Main Analytics Cards -->
        <div class="dashboard-grid">
            <!-- Overview Metrics -->
            <div class="card">
                <h3>📈 Métricas Gerais</h3>
                <div class="metric-grid">
                    <?php if (!empty($engagement_metrics)): ?>
                        <?php $metrics = $engagement_metrics[0]; ?>
                        <div class="metric">
                            <span class="metric-value"><?= number_format($metrics['total_unique_visitors']) ?></span>
                            <div class="metric-label">Visitantes Únicos</div>
                        </div>
                        <div class="metric">
                            <span class="metric-value"><?= number_format($metrics['total_page_views']) ?></span>
                            <div class="metric-label">Visualizações</div>
                        </div>
                        <div class="metric">
                            <span class="metric-value"><?= number_format($metrics['avg_time_spent']) ?>s</span>
                            <div class="metric-label">Tempo Médio</div>
                        </div>
                        <div class="metric">
                            <span class="metric-value"><?= number_format($metrics['avg_scroll_depth']) ?>%</span>
                            <div class="metric-label">Scroll Médio</div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Engagement Analysis -->
            <div class="card">
                <h3>🎯 Análise de Engajamento</h3>
                <?php if (!empty($engagement_metrics)): ?>
                    <?php $metrics = $engagement_metrics[0]; ?>
                    <div style="margin-bottom: 1rem;">
                        <strong>Sessões Engajadas (>30s):</strong>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?= ($metrics['engaged_sessions'] / $metrics['total_page_views']) * 100 ?>%"></div>
                        </div>
                        <small><?= $metrics['engaged_sessions'] ?> de <?= $metrics['total_page_views'] ?> sessões (<?= number_format(($metrics['engaged_sessions'] / $metrics['total_page_views']) * 100, 1) ?>%)</small>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <strong>Leitura Profunda (>50% scroll):</strong>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?= ($metrics['deep_scroll_sessions'] / $metrics['total_page_views']) * 100 ?>%"></div>
                        </div>
                        <small><?= $metrics['deep_scroll_sessions'] ?> de <?= $metrics['total_page_views'] ?> sessões (<?= number_format(($metrics['deep_scroll_sessions'] / $metrics['total_page_views']) * 100, 1) ?>%)</small>
                    </div>
                    
                    <div>
                        <strong>Sessões Interativas:</strong>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?= ($metrics['interactive_sessions'] / $metrics['total_page_views']) * 100 ?>%"></div>
                        </div>
                        <small><?= $metrics['interactive_sessions'] ?> de <?= $metrics['total_page_views'] ?> sessões (<?= number_format(($metrics['interactive_sessions'] / $metrics['total_page_views']) * 100, 1) ?>%)</small>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Hourly Traffic Pattern -->
            <div class="card">
                <h3>⏰ Padrão de Tráfego por Hora</h3>
                <div class="chart-container">
                    <canvas id="hourlyTrafficChart"></canvas>
                </div>
            </div>

            <!-- Device & Browser Analytics -->
            <div class="card">
                <h3>💻 Dispositivos e Navegadores</h3>
                <div class="chart-container">
                    <canvas id="deviceChart"></canvas>
                </div>
            </div>

            <!-- Gallery Analytics -->
            <div class="card">
                <h3>🖼️ Análise da Galeria</h3>
                <?php if ($gallery_summary): ?>
                <div class="metric-grid">
                    <div class="metric">
                        <span class="metric-value"><?= number_format($gallery_summary['users_viewed_gallery'] ?? 0) ?></span>
                        <div class="metric-label">Visualizaram Galeria</div>
                    </div>
                    <div class="metric">
                        <span class="metric-value"><?= number_format($gallery_summary['users_opened_items'] ?? 0) ?></span>
                        <div class="metric-label">Abriram Imagens</div>
                    </div>
                    <div class="metric">
                        <span class="metric-value"><?= number_format($gallery_summary['users_played_videos'] ?? 0) ?></span>
                        <div class="metric-label">Assistiram Vídeos</div>
                    </div>
                </div>
                <?php endif; ?>
                <div class="chart-container">
                    <canvas id="galleryChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Geographic Analytics -->
        <div class="card">
            <h3>🌍 Análise Geográfica</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>País</th>
                            <th>Estado/Região</th>
                            <th>Cidade</th>
                            <th>Visitantes Únicos</th>
                            <th>Total de Visualizações</th>
                            <th>Tempo Médio (s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($geographic_analytics as $geo): ?>
                        <tr>
                            <td><?= htmlspecialchars($geo['country']) ?></td>
                            <td><?= htmlspecialchars($geo['region']) ?></td>
                            <td><?= htmlspecialchars($geo['city']) ?></td>
                            <td><?= number_format($geo['unique_visitors']) ?></td>
                            <td><?= number_format($geo['total_views']) ?></td>
                            <td><?= number_format($geo['avg_time_spent']) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
            <h3>🕐 Atividade Recente</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>IP do Visitante</th>
                            <th>Localização</th>
                            <th>Tempo na Página</th>
                            <th>Scroll</th>
                            <th>Interações</th>
                            <th>Engajamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_views as $view): ?>
                        <tr>
                            <td><?= date('d/m/Y H:i', strtotime($view['view_time'])) ?></td>
                            <td><?= htmlspecialchars($view['visitor_ip']) ?></td>
                            <td><?= htmlspecialchars($view['city'] . ', ' . $view['region']) ?></td>
                            <td><?= $view['time_spent'] ?>s</td>
                            <td><?= $view['scroll_depth'] ?>%</td>
                            <td><?= $view['interactions'] ?></td>
                            <td>
                                <div class="engagement-indicator">
                                    <?php
                                    $engagement_score = ($view['time_spent'] > 30 ? 1 : 0) + 
                                                      ($view['scroll_depth'] > 50 ? 1 : 0) + 
                                                      ($view['interactions'] > 0 ? 1 : 0);
                                    $engagement_class = $engagement_score >= 2 ? 'engagement-high' : 
                                                      ($engagement_score == 1 ? 'engagement-medium' : 'engagement-low');
                                    ?>
                                    <span class="<?= $engagement_class ?>">
                                        <?= $engagement_score >= 2 ? '🟢 Alto' : ($engagement_score == 1 ? '🟡 Médio' : '🔴 Baixo') ?>
                                    </span>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Gallery Activity -->
        <div class="card">
            <h3>🖼️ Atividade da Galeria - Tempo Real</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Localização</th>
                            <th>Ação</th>
                            <th>Item</th>
                            <th>Tipo</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_gallery_activity as $activity): ?>
                        <tr>
                            <td><?= date('d/m/Y H:i:s', strtotime($activity['interaction_time'])) ?></td>
                            <td><?= htmlspecialchars(($activity['city'] ?? 'Unknown') . ', ' . ($activity['country'] ?? 'Unknown')) ?></td>
                            <td>
                                <span class="status-badge status-<?= $activity['action'] ?>">
                                    <?php
                                    $action_labels = [
                                        'opened' => '👁️ Abriu',
                                        'loaded' => '✅ Carregou',
                                        'played' => '▶️ Reproduziu',
                                        'paused' => '⏸️ Pausou',
                                        'finished' => '🏁 Terminou',
                                        'closed' => '❌ Fechou'
                                    ];
                                    echo $action_labels[$activity['action']] ?? $activity['action'];
                                    ?>
                                </span>
                            </td>
                            <td><?= htmlspecialchars($activity['item']) ?></td>
                            <td>
                                <?php
                                $type_icons = [
                                    'image' => '🖼️ Imagem',
                                    'video' => '🎥 Vídeo',
                                    'close' => '❌ Fechar'
                                ];
                                echo $type_icons[$activity['type']] ?? $activity['type'];
                                ?>
                            </td>
                            <td>
                                <?php
                                $status_class = '';
                                $status_text = '';
                                switch($activity['action']) {
                                    case 'opened':
                                        $status_class = 'engagement-medium';
                                        $status_text = '🔍 Interesse';
                                        break;
                                    case 'played':
                                        $status_class = 'engagement-high';
                                        $status_text = '🎯 Engajado';
                                        break;
                                    case 'finished':
                                        $status_class = 'engagement-high';
                                        $status_text = '⭐ Completou';
                                        break;
                                    default:
                                        $status_class = 'engagement-low';
                                        $status_text = '👁️ Visualizou';
                                }
                                ?>
                                <span class="<?= $status_class ?>"><?= $status_text ?></span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Quote Performance -->
        <div class="card">
            <h3>💰 Performance do Orçamento</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Orçamento</th>
                            <th>Cliente</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Visitantes Únicos</th>
                            <th>Total de Visualizações</th>
                            <th>Tempo Médio</th>
                            <th>Engajamento Médio</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($quote_analytics as $quote): ?>
                        <tr>
                            <td><?= htmlspecialchars($quote['quote_name']) ?></td>
                            <td><?= htmlspecialchars($quote['client_name']) ?></td>
                            <td>R$ <?= number_format($quote['total_value'], 2, ',', '.') ?></td>
                            <td><span class="status-badge status-<?= $quote['status'] ?>"><?= ucfirst($quote['status']) ?></span></td>
                            <td><?= number_format($quote['unique_visitors']) ?></td>
                            <td><?= number_format($quote['total_views']) ?></td>
                            <td><?= number_format($quote['avg_time_spent']) ?>s</td>
                            <td><?= number_format($quote['avg_scroll_depth']) ?>% scroll</td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Hourly Traffic Chart
        const hourlyData = <?= json_encode($hourly_traffic) ?>;
        const hourlyLabels = hourlyData.map(item => `${item.hour}:00`);
        const hourlyVisitors = hourlyData.map(item => item.unique_visitors);
        const hourlyViews = hourlyData.map(item => item.total_views);

        const hourlyCtx = document.getElementById('hourlyTrafficChart').getContext('2d');
        new Chart(hourlyCtx, {
            type: 'line',
            data: {
                labels: hourlyLabels,
                datasets: [{
                    label: 'Visitantes Únicos',
                    data: hourlyVisitors,
                    borderColor: '#1e3c72',
                    backgroundColor: 'rgba(30, 60, 114, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Total de Visualizações',
                    data: hourlyViews,
                    borderColor: '#2a5298',
                    backgroundColor: 'rgba(42, 82, 152, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Device Analytics Chart
        const deviceData = <?= json_encode($device_analytics) ?>;
        const deviceLabels = [...new Set(deviceData.map(item => item.device_type))];
        const deviceVisitors = deviceLabels.map(device => 
            deviceData.filter(item => item.device_type === device)
                     .reduce((sum, item) => sum + parseInt(item.unique_visitors), 0)
        );

        const deviceCtx = document.getElementById('deviceChart').getContext('2d');
        new Chart(deviceCtx, {
            type: 'doughnut',
            data: {
                labels: deviceLabels,
                datasets: [{
                    data: deviceVisitors,
                    backgroundColor: [
                        '#1e3c72',
                        '#2a5298',
                        '#3b82f6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Gallery Analytics Chart
        const galleryData = <?= json_encode($gallery_analytics) ?>;
        const galleryItems = [...new Set(galleryData.map(item => item.item))];
        const galleryOpened = galleryItems.map(item => 
            galleryData.filter(data => data.item === item && data.action === 'opened')
                       .reduce((sum, data) => sum + parseInt(data.count), 0)
        );
        const galleryPlayed = galleryItems.map(item => 
            galleryData.filter(data => data.item === item && data.action === 'played')
                       .reduce((sum, data) => sum + parseInt(data.count), 0)
        );

        const galleryCtx = document.getElementById('galleryChart').getContext('2d');
        new Chart(galleryCtx, {
            type: 'bar',
            data: {
                labels: galleryItems.map(item => item.replace(/^.*\//, '').replace(/\.(webp|mp4|png)$/, '')),
                datasets: [{
                    label: 'Visualizações',
                    data: galleryOpened,
                    backgroundColor: '#1e3c72'
                }, {
                    label: 'Reproduções',
                    data: galleryPlayed,
                    backgroundColor: '#2a5298'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Auto-refresh every 30 seconds
        setTimeout(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>