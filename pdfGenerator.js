import PDFDocument from 'pdfkit';
import path from 'path';

export const generatePDF = (data, res) => {
    const { nome, idade, historicoPessoal, familiares } = data;
    const doc = new PDFDocument();
    const filename = `Relatorio_${nome}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const watermarkPath = path.join(path.resolve(), 'logo_raizes.png');
    const watermarkWidth = 300;
    const watermarkHeight = 300;

    doc.image(watermarkPath, (pageWidth - watermarkWidth) / 2, (pageHeight - watermarkHeight) / 2, {
        width: watermarkWidth,
        height: watermarkHeight,
        opacity: 0.3
    });

    doc.fontSize(18).text('RELATÓRIO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Sr(a). ${nome} possui história pessoal de ${historicoPessoal}, atualmente com ${idade} anos.`);
    doc.moveDown();
    doc.text('Familiares com histórico de câncer:');

    familiares.forEach(familiar => {
        doc.moveDown();
        doc.text(`- ${familiar.grau}: ${familiar.tipoCancer}, aos ${familiar.idadeDiagnostico} anos.`);
    });

    doc.moveDown();
    doc.text('Baseado nessas informações, o paciente atende aos critérios internacionalmente reconhecidos, indicando que ele se beneficiaria de um encaminhamento para investigação em um serviço especializado em oncogenética.', {
        align: 'justify',
    });

    doc.end();
};
