import PDFDocument from "pdfkit";
import path from "path";

export const generatePDF = (data, res) => {
  const { nome, idade, historicoPessoal, familiares, precisaPesquisaOncogenetica } = data;
  const doc = new PDFDocument();
  const filename = `Relatorio_${nome}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const watermarkPath = path.join(path.resolve(), "logo_raizes.png");
  const watermarkWidth = 500;
  const watermarkHeight = 500;

  // Adiciona a imagem de marca d'água
  doc.image(
    watermarkPath,
    (pageWidth - watermarkWidth) / 2,
    (pageHeight - watermarkHeight) / 2,
    {
      width: watermarkWidth,
      height: watermarkHeight,
      opacity: 0.02,
    }
  );

  // Define o título em negrito
  doc.font('Helvetica-Bold') // Define a fonte para negrito
     .fontSize(18)
     .text("RELATÓRIO", { align: "center" });

  // Retorna para a fonte normal
  doc.font('Helvetica');

  doc.moveDown();
  doc
    .fontSize(12)
    .text(
      `Sr(a). ${nome} possui história pessoal de ${historicoPessoal}, hoje com ${idade} anos.`
    );

  doc.moveDown();
  doc.text("Reporta os seguintes familiares com câncer:");

  familiares.forEach((familiar) => {
    doc.moveDown();
    doc.text(
      `- ${familiar.grau}: ${familiar.tipoCancer}, aos ${familiar.idadeDiagnostico} anos.`
    );
  });

  doc.moveDown();
  if (precisaPesquisaOncogenetica) {
    doc.text(
      "Com base nessas informações, o paciente atende aos critérios internacionalmente reconhecidos (NCCN e ACMG), indicando que ele se beneficiaria de um encaminhamento para investigação em um serviço especializado em oncogenética.",
      {
        align: "justify",
      }
    );
  } else {
    doc.text(
      "Com base nessas informações, o paciente não atende aos critérios internacionalmente reconhecidos (NCCN e ACMG) para um encaminhamento para investigação em um serviço especializado em oncogenética.",
      {
        align: "justify",
      }
    );
  }

  doc.end();
};
