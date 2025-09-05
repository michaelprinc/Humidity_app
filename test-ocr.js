// Simple OCR smoke test using tesseract.js in Node.
// Success criteria: recognizes some English text from a sample image.
import Tesseract from 'tesseract.js';

async function main() {
  const imageUrl = 'https://tesseract.projectnaptha.com/img/eng_bw.png';
  console.log('[OCR] Starting recognition for:', imageUrl);
  try {
    const { data } = await Tesseract.recognize(imageUrl, 'eng', {
      // Keep it simple; default PSM works for paragraph text.
    });
    const text = (data.text || '').trim();
    console.log('\n[OCR] Raw output:\n---\n' + text + '\n---');

    // Basic assertion: must contain common words from the sample.
    const ok = /the|quick|brown|fox/i.test(text);
    if (!ok) {
      console.error('\n[OCR] Test FAILED: Expected common words not found.');
      process.exit(1);
    }
    console.log('\n[OCR] Test PASSED: Text detected.');
  } catch (err) {
    console.error('[OCR] Error during recognition:', err);
    process.exit(1);
  }
}

main();
