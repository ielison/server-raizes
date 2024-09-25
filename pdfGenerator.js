const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generatePDF = (data, res) => {
    const { nome, idade, historicoPessoal, familiares } = data;

    // Criação do documento PDF
    const doc = new PDFDocument();

    // Definindo o nome do arquivo de saída
    const filename = `Relatorio_${nome}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Pipe do documento para a resposta HTTP
    doc.pipe(res);

    // Tamanho da página
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Carregar imagem da marca d'água
    const watermarkPath = path.join(__dirname, 'logo_raizes.png'); // Caminho da imagem
    const watermarkWidth = 300;
    const watermarkHeight = 300;

    // Adicionar a marca d'água centralizada na página
    doc.image(watermarkPath, (pageWidth - watermarkWidth) / 2, (pageHeight - watermarkHeight) / 2, {
        width: watermarkWidth,
        height: watermarkHeight,
        opacity: 0.3 // Definir opacidade para a marca d'água
    });

    // Título
    doc.fontSize(18).text('RELATÓRIO', { align: 'center' });

    // Corpo do texto
    doc.moveDown();
    doc.fontSize(12).text(`Sr(a). ${nome} possui história pessoal de ${historicoPessoal}, atualmente com ${idade} anos.`);
    doc.moveDown();
    doc.text('Familiares com histórico de câncer:');

    // Listagem dos familiares
    familiares.forEach(familiar => {
        doc.moveDown();
        doc.text(`- ${familiar.grau}: ${familiar.tipoCancer}, aos ${familiar.idadeDiagnostico} anos.`);
    });

    // Rodapé
    doc.moveDown();
    doc.text('Baseado nessas informações, o paciente atende aos critérios internacionalmente reconhecidos, indicando que ele se beneficiaria de um encaminhamento para investigação em um serviço especializado em oncogenética.', {
        align: 'justify',
    });

    // Finalizar o documento
    doc.end();
};

module.exports = generatePDF;
