const ExcelJS = require('exceljs');
const axios = require('axios');

router.get('/export', async (req, res) => {
  try {
    const products = await Product.find();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Product Catalog');

    // ===============================
    // 1. TITLE (CATALOG HEADER)
    // ===============================
    sheet.mergeCells('A1:G2');

    const titleCell = sheet.getCell('A1');
    titleCell.value = '📦 PRODUCT CATALOG';
    titleCell.font = {
      size: 20,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    titleCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };

    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5597' } // deep blue
    };

    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 30;

    // ===============================
    // 2. HEADERS
    // ===============================
    sheet.columns = [
      { header: 'Image', key: 'image', width: 15 },
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Rate (₹)', key: 'rate', width: 12 },
      { header: 'MRP (₹)', key: 'mrp', width: 12 },
      { header: 'Stock', key: 'stock', width: 10 }
    ];

    const headerRow = sheet.getRow(3);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    sheet.getRow(3).height = 22;

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 3 }];

    // ===============================
    // 3. DATA ROWS
    // ===============================
    let rowIndex = 4;

    for (const p of products) {
      const row = sheet.addRow({
        name: p.name,
        code: p.code,
        category: p.category,
        rate: p.rate,
        mrp: p.mrp,
        stock: p.stock
      });

      row.height = 45;

      // Zebra striping (alternate rows)
      const fillColor = rowIndex % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';

      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      });

      // Price formatting
      row.getCell(5).numFmt = '₹#,##0';
      row.getCell(6).numFmt = '₹#,##0';

      // ===============================
      // IMAGE INSERTION
      // ===============================
      if (p.image) {
        try {
          const imageUrl = p.image.startsWith('http')
            ? p.image
            : `${process.env.BASE_URL}${p.image}`;

          const imgRes = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
          });

          const imageId = workbook.addImage({
            buffer: imgRes.data,
            extension: 'png'
          });

          sheet.addImage(imageId, {
            tl: { col: 0, row: rowIndex - 1 },
            ext: { width: 50, height: 50 }
          });

        } catch (err) {
          console.log('Image failed:', p.image);
        }
      }

      rowIndex++;
    }

    // ===============================
    // RESPONSE HEADERS
    // ===============================
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Product-Catalog.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});