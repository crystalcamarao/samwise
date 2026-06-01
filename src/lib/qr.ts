import QRCode from "qrcode";

/** Render a QR code for `text` as a PNG data URL. */
export function makeQrDataUrl(text: string, size = 512): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#101014ff", light: "#ffffffff" },
  });
}
