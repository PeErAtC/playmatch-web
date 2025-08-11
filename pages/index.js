import React from "react";
import Head from "next/head";
import Navbar from "./components/navbar";
import FeatureItem from "./components/FeatureItem";
import { useInView } from "react-intersection-observer";
import { ChevronRight, Flag, Mail, Phone, MapPin } from "lucide-react";
import stylesCss from './styles/index.module.css';

function IndexPage() {
  const featuresData = [
    // --- โค้ดที่อัปเดตและเรียงลำดับใหม่ทั้งหมด ---
    {
      title: "จัดการสมาชิกก๊วน",
      description: "ระบบครบวงจรสำหรับจัดการข้อมูลสมาชิกก๊วนของคุณ ตั้งแต่การเพิ่มผู้เล่นใหม่, ติดตามสถิติ, ไปจนถึงการจัดเก็บรูปโปรไฟล์ส่วนตัวของแต่ละคน ทำให้ทุกข้อมูลเป็นระเบียบและเรียกใช้งานได้ง่าย",
      image: "/images/สกรีนช็อต 2025-08-11 210923.png",
    },
    {
      title: "สร้างและบริหารจัดการแมตซ์",
      description: "ออกแบบและจัดตารางการแข่งขันได้อย่างอิสระ พร้อมระบบสุ่มจับคู่ผู้เล่น 4 คนอัจฉริยะ ที่ช่วยดึงผู้เล่นที่ลงสนามน้อยให้ได้เล่นอย่างสม่ำเสมอ หมดปัญหาการเอาเปรียบและเพิ่มความสนุกในการเล่น",
      image: "/images/สกรีนช็อต 2025-08-11 211045.png",
    },
    {
      title: "คำนวณค่าใช้จ่าย",
      description: "บอกลาความยุ่งยากในการคำนวณ! ระบบของเราจะแยกค่าลูกแบดและค่าสนามให้สมาชิกอัตโนมัติ โดยมีวิธีการคำนวณค่าสนามให้เลือกใช้ถึง 3 รูปแบบ เพื่อให้เข้ากับกฎของแต่ละก๊วนโดยเฉพาะ",
      image: "/images/สกรีนช็อต 2025-08-11 211138.png",
    },
    {
      title: "ระบบจัดอันดับ (Ranking)",
      description: "ยกระดับการแข่งขันให้สนุกยิ่งขึ้นด้วยระบบจัดอันดับผู้เล่น (Ranking System) ที่เป็นเอกลักษณ์ ผู้เล่นจะได้รับคะแนนสะสมจากการแข่งขันแต่ละครั้ง และระบบจะทำการจัดอันดับอัตโนมัติ สร้างแรงจูงใจให้ทุกคนพัฒนาฝีมือ",
      image: "/images/สกรีนช็อต 2025-08-11 211223.png",
    },
    {
      title: "สร้างโปรโมชั่นและคูปองส่วนลด",
      description: "เพิ่มความพิเศษให้สมาชิก! แอดมินสามารถสร้างคูปองส่วนลดสำหรับค่าคอร์ทหรือค่าลูกแบด พร้อมฟังก์ชันบันทึกคูปองเป็นไฟล์รูปภาพคุณภาพสูง เพื่อนำไปพิมพ์หรือส่งต่อได้อย่างสะดวกสบาย",
      image: "/images/สกรีนช็อต 2025-08-11 211240.png",
    },
    {
      title: "แจ้งเตือนวันเกิดของสมาชิก",
      description: "สร้างบรรยากาศที่ดีและความสัมพันธ์อันแน่นแฟ้นในก๊วน! ระบบจะแจ้งเตือนเมื่อถึงวันคล้ายวันเกิดของสมาชิก ทำให้คุณไม่พลาดที่จะส่งคำอวยพรหรือจัดกิจกรรมพิเศษให้คนสำคัญ",
      image: "/images/สกรีนช็อต 2025-08-11 211305.png", // รูปภาพ Placeholder
    },
    {
      title: "ภาพรวมก๊วน (Dashboard)",
      description: "เข้าถึงข้อมูลสถิติสำคัญของก๊วนคุณได้ครบถ้วนในที่เดียวบน Dashboard ที่ใช้งานง่าย ไม่ว่าจะเป็นจำนวนสมาชิก, สถิติการแข่งขัน, หรือข้อมูลผู้เล่นเด่น ช่วยให้คุณมองเห็นภาพรวมและวางแผนจัดการก๊วนได้อย่างมีประสิทธิภาพ",
      image: "/images/สกรีนช็อต 2025-08-11 211326.png",
    },
    {
      title: "บริหารการเงินและบัญชีก๊วน",
      description: "เข้าใจสถานะทางการเงินของก๊วนคุณได้อย่างโปร่งใส ด้วยเครื่องมือบันทึกรายรับ-รายจ่ายที่ออกแบบมาโดยเฉพาะ สามารถบันทึกเงินทุน, ค่าใช้จ่าย, และรายรับอื่นๆ เพื่อให้เห็นภาพรวมสภาพคล่องและวางแผนการเงินได้อย่างมั่นใจ",
      image: "/images/สกรีนช็อต 2025-08-11 211401.png",
    },
    {
      title: "ตั้งค่า",
      description: "ปรับแต่งระบบให้เป็นของคุณ! ในหน้าตั้งค่า คุณสามารถเพิ่มข้อมูลการชำระเงินของก๊วน เช่น เลขที่บัญชี หรือ QR Code สำหรับรับชำระเงิน ช่วยให้สมาชิกสามารถโอนจ่ายค่าใช้จ่ายต่างๆ ได้อย่างสะดวกและรวดเร็ว",
      image: "/images/สกรีนช็อต 2025-08-11 211419.png", // รูปภาพ Placeholder
    },
  ];

  const { ref: heroRef, inView: heroInView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const handleStartButtonClick = () => {
    window.location.href = '/login';
  };

  const heroAnimation = {
    opacity: heroInView ? 1 : 0,
    transform: heroInView ? "translateY(0)" : "translateY(20px)",
    transition: "opacity 1s ease-out, transform 1s ease-out",
  };

  return (
    <div className={stylesCss.container}>
      <Head>
        {/* --- SEO: ปรับปรุง Title & Description --- */}
        <title>PlayMatch: โปรแกรมจัดการก๊วนแบดมินตัน | จัดคิว สุ่มคู่ คำนวณเงิน จัดอันดับ</title>
        <meta
          name="description"
          content="PlayMatch คือโปรแกรมจัดการก๊วนแบดมินตันครบวงจร ช่วยคุณตั้งแต่การบริหารสมาชิก, สร้างตารางแข่ง, สุ่มจับคู่อัจฉริยะ, คำนวณค่าใช้จ่ายอัตโนมัติ ไปจนถึงระบบจัดอันดับ (Ranking) และบริหารการเงินก๊วน"
        />
        <link rel="canonical" href="https://playmatch.pro" />
        <meta property="og:title" content="PlayMatch - โปรแกรมจัดการก๊วนแบดมินตันครบวงจร" />
        <meta property="og:description" content="บริหารสมาชิก, สร้างแมตช์, คำนวณค่าใช้จ่าย, และจัดอันดับผู้เล่นได้อย่างง่ายดาย" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://playmatch.pro" />
        <meta property="og:image" content="https://playmatch.pro/images/สกรีนช็อต 2025-07-04 005806.png" />
      </Head>

      <Navbar />

      <main className={stylesCss.main}>
        <section ref={heroRef} className={stylesCss.heroSection} style={heroAnimation}>
          <h1 className={stylesCss.heroTitle}>
            ยกระดับ <span className={stylesCss.heroTitleHighlight}>ก๊วนแบดมินตัน </span>
            ของคุณด้วย <span className={stylesCss.playMatchText}>Play</span><span className={stylesCss.playMatchTextMatch}>Match</span>
          </h1>
          <p className={stylesCss.heroSubtitle}>
            แพลตฟอร์มจัดการก๊วนแบดมินตันครบวงจร ที่ทำให้ทุกการจัดและบริหารจัดการก๊วนเป็นเรื่องง่ายและสนุก
          </p>
          <button
            className={stylesCss.startButton}
            onClick={handleStartButtonClick}
          >
            เริ่มต้นใช้งาน
          </button>
        </section>

        <section className={stylesCss.featuresSection}>
          <h2 className={stylesCss.featuresTitle}>ระบบของเราทำงานอย่างไร?</h2>
          {featuresData.map((feature, index) => (
            <FeatureItem key={index} feature={feature} index={index} />
          ))}
        </section>
      </main>

      <footer className={stylesCss.footer}>
        <div className={stylesCss.footerContent}>
          <div className={stylesCss.footerSection}>
            <div className={stylesCss.footerLogo}>
              <Flag size={40} color="#64b5f6" />
              <span className={stylesCss.footerBrandName}>
                <span className={stylesCss.playMatchText}>Play</span><span className={stylesCss.playMatchTextMatch}>Match</span>
              </span>
            </div>
            <p className={stylesCss.footerAbout}>
              PlayMatch คือแพลตฟอร์มที่ออกแบบมาเพื่อปฏิวัติการจัดการก๊วนแบดมินตัน ให้ทุกขั้นตอนเป็นไปอย่างราบรื่นและมีประสิทธิภาพ ตอบโจทย์ทุกความต้องการของนักกีฬาและผู้จัด
            </p>
          </div>
          <div className={stylesCss.footerSection}>
            <h4 className={stylesCss.footerHeading}>บริการของเรา</h4>
            {/* --- อัปเดตลิสต์บริการใน Footer --- */}
            <ul className={stylesCss.footerList}>
              <li><a href="#" className={stylesCss.footerLink}>จัดการสมาชิก</a></li>
              <li><a href="#" className={stylesCss.footerLink}>สร้างและบริหารจัดการแมตซ์</a></li>
              <li><a href="#" className={stylesCss.footerLink}>คำนวณค่าใช้จ่าย</a></li>
              <li><a href="#" className={stylesCss.footerLink}>ระบบจัดอันดับ</a></li>
              <li><a href="#" className={stylesCss.footerLink}>สร้างโปรโมชั่นและคูปองส่วนลด</a></li>
              <li><a href="#" className={stylesCss.footerLink}>แจ้งเตือนวันเกิดของสมาชิก</a></li>
              <li><a href="#" className={stylesCss.footerLink}>ภาพรวมก๊วน (Dashboard)</a></li>
              <li><a href="#" className={stylesCss.footerLink}>บริหารการเงินและบัญชีก๊วน</a></li>
              <li><a href="#" className={stylesCss.footerLink}>ตั้งค่าข้อมูลส่วนตัวและการชำระเงิน</a></li>
            </ul>
          </div>
          <div className={stylesCss.footerSection}>
            <h4 className={stylesCss.footerHeading}>ติดต่อเรา</h4>
            <ul className={stylesCss.footerList}>
              <li><a href="mailto:playmatch.web@gmail.com" className={stylesCss.footerLink}><Mail size={18} className={stylesCss.footerIcon} /> playmatch.web@gmail.com</a></li>
              <li className={stylesCss.footerLink}><MapPin size={18} className={stylesCss.footerIcon} /> 123 ถนนเพลย์แมตช์, เขตสุขสบาย, กรุงเทพมหานคร 10110, ประเทศไทย</li>
            </ul>
          </div>
        </div>
        <div className={stylesCss.footerBottom}>
          <p className={stylesCss.footerCopyright}>© 2025 PlayMatch Co., Ltd. All rights reserved.</p>
          <div className={stylesCss.footerSocialIcons}>
            <a href="#" className={stylesCss.socialIcon}><img src="/images/facebook.png" alt="ไอคอน Facebook" style={{ width: '24px', height: '24px' }} /></a>
            <a href="#" className={stylesCss.socialIcon}><img src="/images/line.png" alt="ไอคอน LINE" style={{ width: '24px', height: '24px' }} /></a>
            <a href="#" className={stylesCss.socialIcon}><img src="/images/twitter.png" alt="ไอคอน Twitter" style={{ width: '24px', height: '24px' }} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default IndexPage;
