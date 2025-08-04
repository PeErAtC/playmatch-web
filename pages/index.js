import React from "react";
import Head from "next/head";
import Navbar from "./components/navbar";
import { useInView } from "react-intersection-observer";
import { ChevronRight, Flag, Mail, Phone, MapPin } from "lucide-react";
import stylesCss from './styles/index.module.css';

function IndexPage() {
  const featuresData = [
    {
      title: "จัดการสมาชิกก๊วน",
      description: "ระบบครบวงจรสำหรับการจัดการสมาชิกก๊วนของคุณ ตั้งแต่การเพิ่มข้อมูลผู้เล่นใหม่ได้อย่างง่ายดาย ไปจนถึงการเช็คชื่อผู้เข้าร่วมในแต่ละแมตช์ ทุกข้อมูลถูกจัดเก็บอย่างเป็นระเบียบ ทำให้คุณสามารถติดตามสถิติและการมีส่วนร่วมของสมาชิกได้อย่างแม่นยำและรวดเร็ว.",
      image: "/images/สกรีนช็อต 2025-07-04 005806.png",
    },
    {
      title: "สร้างและบริหารจัดการแมตซ์",
      description: "ออกแบบและจัดตารางการแข่งขันได้อย่างอิสระ ไม่ว่าจะเป็นแมตช์ประจำวันหรือทัวร์นาเมนต์พิเศษ ระบบจะช่วยให้คุณกำหนดคู่แข่งขัน สนาม เวลา และเงื่อนไขต่างๆ ได้อย่างละเอียด พร้อมบันทึกประวัติทุกการแข่งขัน ทำให้คุณสามารถย้อนดูผลลัพธ์และสถิติสำคัญได้ตลอดเวลา.",
      image: "/images/สกรีนช็อต 2025-07-04 005934.png",
    },
    {
      title: "คำนวณค่าใช้จ่าย",
      description: "บอกลาความยุ่งยากในการคำนวณค่าใช้จ่าย! ระบบของเราจะแยกค่าลูกแบดมินตันและค่าสนามให้กับสมาชิกแต่ละคนโดยอัตโนมัติ ตามการเข้าร่วมและการใช้จ่ายจริง ช่วยให้การจัดการการเงินของก๊วนเป็นเรื่องง่าย โปร่งใส และยุติธรรม.",
      image: "/images/สกรีนช็อต 2025-07-04 010138.png",
    },
    {
      title: "ระบบจัดอันดับ (Ranking)",
      description: "ยกระดับการแข่งขันให้สนุกยิ่งขึ้นด้วยระบบจัดอันดับผู้เล่น (Ranking System) ที่เป็นเอกลักษณ์ ผู้เล่นจะได้รับคะแนนสะสมจากการแข่งขันแต่ละครั้ง และระบบจะทำการจัดอันดับอัตโนมัติ สร้างแรงจูงใจให้ทุกคนพัฒนาฝีมือและไต่เต้าสู่จุดสูงสุดของก๊วน.",
      image: "/images/สกรีนช็อต 2025-07-04 010227.png",
    },
    {
      title: "ภาพรวมก๊วน (Dashboard)",
      description: "เข้าถึงข้อมูลสถิติสำคัญของก๊วนคุณได้ครบถ้วนในที่เดียวบน Dashboard ที่ใช้งานง่าย ไม่ว่าจะเป็นจำนวนสมาชิก สถิติการแข่งขัน ค่าใช้จ่ายรวม หรือข้อมูลผู้เล่นเด่น ช่วยให้คุณมองเห็นภาพรวมและวางแผนการจัดการก๊วนได้อย่างมีประสิทธิภาพ.",
      image: "/images/สกรีนช็อต 2025-07-04 010304.png",
    },
  ];

  const { ref: heroRef, inView: heroInView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const handleStartButtonClick = () => {
    window.location.href = '/login';
  };

  // Style สำหรับ animation เท่านั้น ที่เหลือจะใช้ CSS Module
  const heroAnimation = {
    opacity: heroInView ? 1 : 0,
    transform: heroInView ? "translateY(0)" : "translateY(20px)",
    transition: "opacity 1s ease-out, transform 1s ease-out",
  };

  return (
    <div className={stylesCss.container}>
      <Head>
        {/* --- START: ส่วนที่ปรับปรุงเพื่อ SEO และ Branding (playmatch.pro) --- */}
        <title>PlayMatch - โปรแกรมจัดการก๊วนแบดมินตันครบวงจร | จัดคิวผู้เล่นลงสนามและคำนวณค่าใช้จ่ายอัตโนมัติ</title>
        <meta
          name="description"
          content="ยกระดับก๊วนแบดมินตันของคุณด้วย PlayMatch! โปรแกรมจัดการก๊วนที่ช่วยให้คุณบริหารสมาชิก, สร้างแมตช์, คำนวณค่าใช้จ่าย, และจัดอันดับผู้เล่นได้อย่างง่ายดาย"
        />

        {/* URL หลักของเว็บไซต์สำหรับบอก Google */}
        <link rel="canonical" href="https://playmatch.pro" />

        {/* ข้อมูลสำหรับแสดงผลเมื่อแชร์บน Social Media (Facebook, LINE, etc.) */}
        <meta property="og:title" content="PlayMatch - โปรแกรมจัดการก๊วนแบดมินตันครบวงจร" />
        <meta property="og:description" content="บริหารสมาชิก, สร้างแมตช์, คำนวณค่าใช้จ่าย, และจัดอันดับผู้เล่นได้อย่างง่ายดาย" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://playmatch.pro" />
        <meta property="og:image" content="https://playmatch.pro/images/สกรีนช็อต 2025-07-04 005806.png" />
        {/* --- END: ส่วนที่ปรับปรุง --- */}
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
          {featuresData.map((feature, index) => {
            const { ref, inView } = useInView({
              triggerOnce: true,
              threshold: 0.3,
              delay: 200,
            });

            const directionClass = index % 2 === 0 ? stylesCss['feature-left'] : stylesCss['feature-right'];
            const visibilityClass = inView ? stylesCss['feature-visible'] : '';

            return (
              <div
                key={index}
                ref={ref}
                className={`${stylesCss.featureItem} ${directionClass} ${visibilityClass}`}
              >
                <div className={stylesCss.featureImageContainer}>
                  <img
                    src={feature.image}
                    alt={feature.title + " - หน้าจอ PlayMatch"}
                    className={stylesCss.featureImage}
                  />
                </div>
                <div className={stylesCss.featureContent}>
                  <h3 className={stylesCss.featureContentTitle}>{feature.title}</h3>
                  <p className={stylesCss.featureContentDescription}>
                    {feature.description}
                  </p>
                  <a href="#" className={stylesCss.featureLearnMore}>
                    เรียนรู้เพิ่มเติม <ChevronRight size={18} style={{ verticalAlign: 'middle' }} />
                  </a>
                </div>
              </div>
            );
          })}
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
            <ul className={stylesCss.footerList}>
              <li><a href="#" className={stylesCss.footerLink}>จัดการสมาชิก</a></li>
              <li><a href="#" className={stylesCss.footerLink}>สร้างและบริหารแมตซ์</a></li>
              <li><a href="#" className={stylesCss.footerLink}>คำนวณค่าใช้จ่าย</a></li>
              <li><a href="#" className={stylesCss.footerLink}>ระบบจัดอันดับ</a></li>
              <li><a href="#" className={stylesCss.footerLink}>ภาพรวมก๊วน</a></li>
            </ul>
          </div>
          <div className={stylesCss.footerSection}>
            <h4 className={stylesCss.footerHeading}>ติดต่อเรา</h4>
            <ul className={stylesCss.footerList}>
              <li><a href="mailto:playmatch.web@gmail.com" className={stylesCss.footerLink}><Mail size={18} className={stylesCss.footerIcon} /> playmatch.web@gmail.com</a></li>
              <li><a href="tel:+66909989136" className={stylesCss.footerLink}><Phone size={18} className={stylesCss.footerIcon} /> +66 90 998 9136</a></li>
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
