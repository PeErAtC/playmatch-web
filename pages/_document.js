// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon ของคุณอยู่ที่นี่ ชี้ไปที่ public/images/Logo.png */}
        <link rel="icon" href="/images/Logo.png" type="image/png" />

        {/* Optional: ถ้าคุณต้องการกำหนดขนาดไอคอนสำหรับบางอุปกรณ์ */}
        {/* <link rel="apple-touch-icon" href="/images/Logo.png" /> */}
        {/* <link rel="icon" type="image/png" sizes="32x32" href="/images/Logo.png" /> */}
        {/* <link rel="icon" type="image/png" sizes="16x16" href="/images/Logo.png" /> */}

        {/* คุณสามารถตั้ง Title ของแท็บเบราว์เซอร์ได้ที่นี่ (ถ้ายังไม่มี) */}
        {/* <title>Ranking - PBTH</title> */}

      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
