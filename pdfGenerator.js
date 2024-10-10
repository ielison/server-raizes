import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export const generatePDF = (data, res) => {
  const {
    nome,
    idade,
    historicoPessoal,
    familiares,
    precisaPesquisaOncogenetica,
  } = data;
  const doc = new PDFDocument();
  const filename = `Relatorio_${nome}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  doc.pipe(res);

  // Register Inter fonts
  doc.registerFont('Inter', path.join(path.resolve(), 'fonts/Inter-Regular.ttf'));
  doc.registerFont('Inter-Bold', path.join(path.resolve(), 'fonts/Inter-Bold.ttf'));

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const watermarkPath = path.join(path.resolve(), "logo_raizes.png");
  const watermarkWidth = 500;
  const watermarkHeight = 500;

  // Function to add watermark
  const addWatermark = () => {
    doc.save();
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
    doc.restore();
  };

  // Add watermark to the first page
  addWatermark();

  // Add watermark to each new page
  doc.on("pageAdded", addWatermark);

  // Define o título em negrito
  doc
    .font("Inter-Bold")
    .fontSize(18)
    .text("RELATÓRIO", { align: "center" });

  // Retorna para a fonte normal
  doc.font("Inter");

  doc.moveDown();
  doc
    .fontSize(12)
    .text(
      `Sr(a). ${nome} possui história pessoal de ${historicoPessoal}, hoje com ${idade} anos.`
    );

  doc.moveDown();
  if (familiares && familiares.length > 0) {
    doc.text("Reporta os seguintes familiares com câncer:");

    let currentGrau = "";
    let cancers = [];

    familiares.forEach((familiar, index) => {
      if (familiar.grau !== currentGrau) {
        if (cancers.length > 0) {
          doc.moveDown();
          doc.text(`- ${currentGrau}: ${cancers.join(", ")}`);
          cancers = [];
        }
        currentGrau = familiar.grau;
      }
      cancers.push(
        `${familiar.tipoCancer} aos ${familiar.idadeDiagnostico} anos`
      );

      if (index === familiares.length - 1) {
        doc.moveDown();
        doc.text(`- ${currentGrau}: ${cancers.join(", ")}`);
      }
    });
  } else {
    doc.text("Não reporta familiares com câncer.");
  }

  doc.moveDown();
  if (precisaPesquisaOncogenetica) {
    doc
      .font("Inter")
      .text("Com base nessas informações, ", { continued: true })
      .font("Inter-Bold")
      .text("o paciente atende", { continued: true })
      .font("Inter")
      .text(" aos critérios internacionalmente reconhecidos (NCCN e ACMG), indicando que ele se beneficiaria de um encaminhamento para investigação em um serviço especializado em oncogenética.", {
        align: "justify",
      });
  } else {
    doc
      .font("Inter")
      .text("Com base nessas informações, ", { continued: true })
      .font("Inter-Bold")
      .text("o paciente não atende", { continued: true })
      .font("Inter")
      .text(" aos critérios internacionalmente reconhecidos (NCCN e ACMG) para um encaminhamento para investigação em um serviço especializado em oncogenética.", {
        align: "justify",
      });
  }

  doc.end();
};
