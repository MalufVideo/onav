<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['dashboard_logged_in']) || $_SESSION['dashboard_logged_in'] !== true) {
    header('Location: dashboard.php');
    exit;
}

// Database configuration
$host = 'localhost';
$dbname = 'u148986826_bluefit';
$username = 'u148986826_bluefit';
$password = 'Bananeta1234@';

$message = '';
$error = '';

if ($_POST['confirm_reset'] ?? '' === 'yes') {
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Count records before deletion
        $stmt = $pdo->query("SELECT COUNT(*) as total_views FROM quote_views");
        $total_views = $stmt->fetch(PDO::FETCH_ASSOC)['total_views'];
        
        $stmt = $pdo->query("SELECT COUNT(*) as total_gallery FROM gallery_interactions");
        $total_gallery = $stmt->fetch(PDO::FETCH_ASSOC)['total_gallery'];
        
        // Clear all tracking data
        $pdo->exec("DELETE FROM quote_views");
        $pdo->exec("DELETE FROM gallery_interactions");
        $pdo->exec("DELETE FROM conversion_tracking");
        $pdo->exec("DELETE FROM email_tracking");
        
        // Reset auto increment
        $pdo->exec("ALTER TABLE quote_views AUTO_INCREMENT = 1");
        $pdo->exec("ALTER TABLE gallery_interactions AUTO_INCREMENT = 1");
        $pdo->exec("ALTER TABLE conversion_tracking AUTO_INCREMENT = 1");
        $pdo->exec("ALTER TABLE email_tracking AUTO_INCREMENT = 1");
        
        $message = "✅ Dados resetados com sucesso!<br>
                   📊 Views removidas: $total_views<br>
                   🖼️ Interações da galeria removidas: $total_gallery<br>
                   🎯 O orçamento está pronto para ser enviado ao cliente.";
        
    } catch(PDOException $e) {
        $error = "❌ Erro ao resetar dados: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset de Dados - Dashboard</title>
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
            padding: 2rem;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #e9ecef;
        }

        .header h1 {
            color: #dc3545;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }

        .header p {
            color: #6c757d;
            font-size: 1.1rem;
        }

        .warning-box {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }

        .warning-box h3 {
            color: #856404;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .warning-list {
            color: #856404;
            margin-left: 1.5rem;
        }

        .warning-list li {
            margin-bottom: 0.5rem;
        }

        .success-message, .error-message {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }

        .success-message {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .error-message {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .form-section {
            text-align: center;
        }

        .confirm-checkbox {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 2rem;
            padding: 1rem;
            background-color: #f8f9fa;
            border-radius: 8px;
        }

        .confirm-checkbox input[type="checkbox"] {
            transform: scale(1.2);
        }

        .confirm-checkbox label {
            font-weight: 500;
            color: #495057;
        }

        .button-group {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
        }

        .btn-danger {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
        }

        .btn-danger:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .btn-secondary:hover {
            background: #5a6268;
            transform: translateY(-1px);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .back-link {
            text-align: center;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #e9ecef;
        }

        .back-link a {
            color: #1e3c72;
            text-decoration: none;
            font-weight: 500;
        }

        .back-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗑️ Reset de Dados do Dashboard</h1>
            <p>Limpar todos os dados de teste antes de enviar ao cliente</p>
        </div>

        <?php if ($message): ?>
        <div class="success-message">
            <?= $message ?>
        </div>
        <div class="form-section">
            <a href="dashboard.php" class="btn btn-secondary">
                📊 Voltar ao Dashboard
            </a>
        </div>
        <?php elseif ($error): ?>
        <div class="error-message">
            <?= $error ?>
        </div>
        <div class="form-section">
            <a href="dashboard.php" class="btn btn-secondary">
                📊 Voltar ao Dashboard
            </a>
        </div>
        <?php else: ?>
        
        <div class="warning-box">
            <h3>⚠️ Atenção: Esta ação é irreversível!</h3>
            <p style="margin-bottom: 1rem;">Este reset irá remover permanentemente:</p>
            <ul class="warning-list">
                <li>📊 Todas as visualizações do orçamento</li>
                <li>🖼️ Todas as interações da galeria</li>
                <li>📧 Histórico de emails</li>
                <li>🎯 Dados de conversão</li>
                <li>📈 Métricas de engajamento</li>
            </ul>
        </div>

        <form method="POST" action="" id="resetForm">
            <div class="confirm-checkbox">
                <input type="checkbox" id="confirmCheck" onchange="toggleResetButton()">
                <label for="confirmCheck">Eu confirmo que quero resetar todos os dados de teste</label>
            </div>

            <div class="button-group">
                <button type="submit" name="confirm_reset" value="yes" class="btn btn-danger" id="resetBtn" disabled>
                    🗑️ Confirmar Reset
                </button>
                <a href="dashboard.php" class="btn btn-secondary">
                    ❌ Cancelar
                </a>
            </div>
        </form>
        
        <?php endif; ?>

        <div class="back-link">
            <a href="dashboard.php">← Voltar ao Dashboard</a>
        </div>
    </div>

    <script>
        function toggleResetButton() {
            const checkbox = document.getElementById('confirmCheck');
            const resetBtn = document.getElementById('resetBtn');
            resetBtn.disabled = !checkbox.checked;
        }

        // Add extra confirmation
        document.getElementById('resetForm').addEventListener('submit', function(e) {
            if (!confirm('Tem certeza absoluta que deseja resetar TODOS os dados?\n\nEsta ação NÃO pode ser desfeita!')) {
                e.preventDefault();
            }
        });
    </script>
</body>
</html>