<?php
require_once 'vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

// Get the HTML content from bluefit_v2.php
ob_start();
include 'bluefit_v2.php';
$html = ob_get_clean();

// Configure DomPDF options
$options = new Options();
$options->set('defaultFont', 'Arial');
$options->set('isRemoteEnabled', true);
$options->set('isHtml5ParserEnabled', true);
$options->set('isFontSubsettingEnabled', true);

// Create new PDF document
$dompdf = new Dompdf($options);

// Modify HTML for better PDF output
$pdfHtml = preg_replace('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi', '', $html);
$pdfHtml = str_replace('style="max-width:180px; max-height:60px; display:block;"', 'style="max-width:180px; max-height:60px; display:block; position:absolute;"', $pdfHtml);

// Add PDF-specific styles
$pdfStyles = "
<style>
    @page {
        margin: 0.5in;
        size: A4;
    }
    body {
        font-size: 12px;
        line-height: 1.4;
        background: white !important;
    }
    .container {
        box-shadow: none !important;
        max-width: none !important;
    }
    .header {
        page-break-inside: avoid;
    }
    .section {
        page-break-inside: avoid;
        margin-bottom: 20px;
    }
    table {
        page-break-inside: avoid;
        font-size: 11px;
    }
    .total-section {
        page-break-inside: avoid;
        margin: 20px 0 0 0 !important;
    }
    .gallery-grid {
        display: none !important;
    }
    .lightbox {
        display: none !important;
    }
</style>";

$pdfHtml = str_replace('</head>', $pdfStyles . '</head>', $pdfHtml);

// Load HTML content
$dompdf->loadHtml($pdfHtml);

// Set paper size and orientation
$dompdf->setPaper('A4', 'portrait');

// Render PDF
$dompdf->render();

// Output PDF
$filename = 'Orcamento_Bluefit_2025_V2_' . date('Y-m-d') . '.pdf';
$dompdf->stream($filename, array('Attachment' => true));
?>