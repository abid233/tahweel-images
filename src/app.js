const $ = (id) => document.getElementById(id);
const state = { items: [] };
const outputExtensions = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

function formatBytes(bytes) { if (!bytes) return '0 بايت'; const units = ['بايت', 'KB', 'MB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
function baseName(name) { return name.replace(/\.[^.]+$/, ''); }
function updateButtons() { const hasItems = state.items.length > 0; const converted = state.items.some((item) => item.output); $('convertAll').disabled = !hasItems; $('downloadAll').disabled = !converted; }
function render() {
  $('emptyState').classList.toggle('hidden', state.items.length > 0);
  $('imageList').innerHTML = state.items.map((item, index) => {
    const after = item.output ? `<div class="after"><span>${formatBytes(item.output.size)}</span><strong class="success">جاهزة</strong></div>` : '<span class="waiting">بانتظار التحويل</span>';
    return `<article class="image-item"><img src="${item.preview}" alt="معاينة ${item.file.name}" /><div class="file-info"><strong>${item.file.name}</strong><span>${formatBytes(item.file.size)} · ${item.width}×${item.height}</span></div>${after}<button class="remove" data-index="${index}" aria-label="حذف الصورة">×</button></article>`;
  }).join('');
  document.querySelectorAll('.remove').forEach((button) => button.addEventListener('click', () => { const [removed] = state.items.splice(Number(button.dataset.index), 1); URL.revokeObjectURL(removed.preview); render(); updateButtons(); }));
}
async function addFiles(files) {
  const allowed = [...files].filter((file) => ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)).slice(0, 30 - state.items.length);
  for (const file of allowed) { const image = await createImageBitmap(file); state.items.push({ file, width: image.width, height: image.height, preview: URL.createObjectURL(file), output: null }); image.close(); }
  render(); updateButtons();
}
async function convertItem(item) {
  const format = $('format').value; const quality = Number($('quality').value) / 100; const limit = Number($('maxWidth').value);
  const image = await createImageBitmap(item.file); const ratio = limit && image.width > limit ? limit / image.width : 1;
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
  const context = canvas.getContext('2d'); if (format === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
  context.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
  if (!blob) throw new Error('تعذر تحويل الصورة.');
  item.output = new File([blob], `${baseName(item.file.name)}.${outputExtensions[format]}`, { type: format });
}
async function convertAll() {
  const button = $('convertAll'); button.disabled = true; button.textContent = 'جارٍ التحويل…';
  try { for (const item of state.items) await convertItem(item); render(); } catch (error) { alert(error.message); }
  finally { button.textContent = 'تحويل الصور'; updateButtons(); }
}
function downloadBlob(blob, name) { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); }
async function downloadAll() {
  const outputs = state.items.filter((item) => item.output); if (!outputs.length) return;
  const button = $('downloadAll'); button.disabled = true; button.textContent = 'جارٍ تجهيز ZIP…';
  try { const zip = new JSZip(); outputs.forEach((item) => zip.file(item.output.name, item.output)); downloadBlob(await zip.generateAsync({ type: 'blob' }), 'tahweel-images.zip'); }
  finally { button.textContent = 'تنزيل الكل ZIP'; updateButtons(); }
}
$('quality').addEventListener('input', () => { $('qualityValue').textContent = `${$('quality').value}%`; });
$('fileInput').addEventListener('change', ({ target }) => addFiles(target.files));
$('convertAll').addEventListener('click', convertAll); $('downloadAll').addEventListener('click', downloadAll);
['dragenter', 'dragover'].forEach((event) => $('dropZone').addEventListener(event, (item) => { item.preventDefault(); $('dropZone').classList.add('dragging'); }));
['dragleave', 'drop'].forEach((event) => $('dropZone').addEventListener(event, (item) => { item.preventDefault(); $('dropZone').classList.remove('dragging'); }));
$('dropZone').addEventListener('drop', ({ dataTransfer }) => addFiles(dataTransfer.files));
