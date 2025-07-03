import React from "react";
import Head from "next/head";
import Navbar from "./components/navbar";
import { useInView } from "react-intersection-observer";
import { ChevronRight, Flag, Mail, Phone, MapPin } from "lucide-react";

// !!! สำคัญมาก: ปรับ Path นี้ให้ตรงกับตำแหน่งของไฟล์ index.module.css ของคุณ !!!
import stylesCss from './styles/index.module.css';

function IndexPage() {
  const featuresData = [
    {
      title: "จัดการสมาชิกก๊วน",
      description: "ระบบครบวงจรสำหรับการจัดการสมาชิกก๊วนของคุณ ตั้งแต่การเพิ่มข้อมูลผู้เล่นใหม่ได้อย่างง่ายดาย ไปจนถึงการเช็คชื่อผู้เข้าร่วมในแต่ละแมตช์ ทุกข้อมูลถูกจัดเก็บอย่างเป็นระเบียบ ทำให้คุณสามารถติดตามสถิติและการมีส่วนร่วมของสมาชิกได้อย่างแม่นยำและรวดเร็ว.",
      image: "/images/สกรีนช็อต 2025-07-04 005806.png", // Path สำหรับรูปภาพใน public/images/
    },
    {
      title: "สร้างและบริหารจัดการแมตซ์",
      description: "ออกแบบและจัดตารางการแข่งขันได้อย่างอิสระ ไม่ว่าจะเป็นแมตช์ประจำวันหรือทัวร์นาเมนต์พิเศษ ระบบจะช่วยให้คุณกำหนดคู่แข่งขัน สนาม เวลา และเงื่อนไขต่างๆ ได้อย่างละเอียด พร้อมบันทึกประวัติทุกการแข่งขัน ทำให้คุณสามารถย้อนดูผลลัพธ์และสถิติสำคัญได้ตลอดเวลา.",
      image: "/images/สกรีนช็อต 2025-07-04 005934.png", // Path สำหรับรูปภาพใน public/images/
    },
    {
      title: "คำนวณค่าใช้จ่าย",
      description: "บอกลาความยุ่งยากในการคำนวณค่าใช้จ่าย! ระบบของเราจะแยกค่าลูกแบดมินตันและค่าสนามให้กับสมาชิกแต่ละคนโดยอัตโนมัติ ตามการเข้าร่วมและการใช้จ่ายจริง ช่วยให้การจัดการการเงินของก๊วนเป็นเรื่องง่าย โปร่งใส และยุติธรรม.",
      image: "/images/สกรีนช็อต 2025-07-04 010138.png", // Path สำหรับรูปภาพใน public/images/
    },
    {
      title: "ระบบจัดอันดับ (Ranking)",
      description: "ยกระดับการแข่งขันให้สนุกยิ่งขึ้นด้วยระบบจัดอันดับผู้เล่น (Ranking System) ที่เป็นเอกลักษณ์ ผู้เล่นจะได้รับคะแนนสะสมจากการแข่งขันแต่ละครั้ง และระบบจะทำการจัดอันดับอัตโนมัติ สร้างแรงจูงใจให้ทุกคนพัฒนาฝีมือและไต่เต้าสู่จุดสูงสุดของก๊วน.",
      image: "/images/สกรีนช็อต 2025-07-04 010227.png", // Path สำหรับรูปภาพใน public/images/
    },
    {
      title: "ภาพรวมก๊วน (Dashboard)",
      description: "เข้าถึงข้อมูลสถิติสำคัญของก๊วนคุณได้ครบถ้วนในที่เดียวบน Dashboard ที่ใช้งานง่าย ไม่ว่าจะเป็นจำนวนสมาชิก สถิติการแข่งขัน ค่าใช้จ่ายรวม หรือข้อมูลผู้เล่นเด่น ช่วยให้คุณมองเห็นภาพรวมและวางแผนการจัดการก๊วนได้อย่างมีประสิทธิภาพ.",
      image: "/images/สกรีนช็อต 2025-07-04 010304.png", // Path สำหรับรูปภาพใน public/images/
    },
  ];

  const { ref: heroRef, inView: heroInView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  // ฟังก์ชันสำหรับจัดการการคลิกปุ่มเริ่มต้นใช้งาน
  const handleStartButtonClick = () => {
    // นี่คือส่วนที่คุณจะระบุ path ไปยังหน้า patch login ของคุณ
    window.location.href = '/login'; // เปลี่ยน '/patch_login' เป็น path จริงของคุณ
  };

  return (
    <div style={inlineStyles.container}>
      <Head>
        <title>PlayMatch - แพลตฟอร์มจัดการก๊วนแบดมินตันครบวงจร</title> {/* แก้ไขตรงนี้ให้เป็น PlayMatch */}
        <meta
          name="description"
          content="PlayMatch: จัดการสมาชิก, สร้างแมตซ์, คำนวณค่าใช้จ่าย, จัดอันดับ และดูภาพรวมก๊วน" /* แก้ไขตรงนี้ให้เป็น PlayMatch */
        />
      </Head>

      <Navbar />

      <main style={inlineStyles.main}>
        <section ref={heroRef} style={{
          ...inlineStyles.heroSection,
          opacity: heroInView ? 1 : 0,
          transform: heroInView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 1s ease-out, transform 1s ease-out",
        }}>
          <h1 style={inlineStyles.heroTitle}>
            ยกระดับ <span style={inlineStyles.heroTitleHighlight}>ก๊วนแบดมินตัน </span>
            ของคุณด้วย <span style={{ color: '#fff' }}>Play</span><span style={{ color: '#64b5f6' }}>Match</span> {/* แก้ไขตรงนี้: Play สีขาว, Match สีน้ำเงิน */}
          </h1>
          <p style={inlineStyles.heroSubtitle}>
            แพลตฟอร์มจัดการก๊วนแบดมินตันครบวงจร ที่ทำให้ทุกการจัดและบริหารจัดการก๊วนเป็นเรื่องง่ายและสนุก
          </p>
          <button
            className={stylesCss.startButton}
            style={inlineStyles.startButton}
            onClick={handleStartButtonClick}
          >
            เริ่มต้นใช้งาน
          </button>
        </section>

        <section style={inlineStyles.featuresSection}>
          <h2 style={inlineStyles.featuresTitle}>ระบบของเราทำงานอย่างไร?</h2>
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
                className={`${directionClass} ${visibilityClass}`}
                style={{
                  ...inlineStyles.featureItem,
                  flexDirection: index % 2 === 0 ? "row" : "row-reverse",
                }}
              >
                <div style={inlineStyles.featureImageContainer}>
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className={stylesCss.featureImage}
                    style={inlineStyles.featureImage}
                  />
                </div>
                <div style={inlineStyles.featureContent}>
                  <h3 className={stylesCss.featureContentTitle} style={inlineStyles.featureContentTitle}>{feature.title}</h3>
                  <p style={inlineStyles.featureContentDescription}>
                    {feature.description}
                  </p>
                  <a href="#" className={stylesCss.featureLearnMore} style={inlineStyles.featureLearnMore}>
                    เรียนรู้เพิ่มเติม <ChevronRight size={18} style={{verticalAlign: 'middle'}} />
                  </a>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      <footer style={inlineStyles.footer}>
        <div style={inlineStyles.footerContent}>
          <div style={inlineStyles.footerSection}>
            <div style={inlineStyles.footerLogo}>
              <Flag size={40} color="#64b5f6" />
              <span style={inlineStyles.footerBrandName}>
                <span style={{ color: '#fff' }}>Play</span><span style={{ color: '#64b5f6' }}>Match</span> {/* แก้ไขตรงนี้: Play สีขาว, Match สีน้ำเงิน */}
              </span>
            </div>
            <p style={inlineStyles.footerAbout}>
              PlayMatch คือแพลตฟอร์มที่ออกแบบมาเพื่อปฏิวัติการจัดการก๊วนแบดมินตัน ให้ทุกขั้นตอนเป็นไปอย่างราบรื่นและมีประสิทธิภาพ ตอบโจทย์ทุกความต้องการของนักกีฬาและผู้จัด
            </p>
          </div>
          <div style={inlineStyles.footerSection}>
            <h4 className={stylesCss.footerHeading} style={inlineStyles.footerHeading}>บริการของเรา</h4>
            <ul style={inlineStyles.footerList}>
              <li><a href="#" className={stylesCss.footerLink} style={inlineStyles.footerLink}>จัดการสมาชิก</a></li>
              <li><a href="#" className={stylesCss.footerLink} style={inlineStyles.footerLink}>สร้างและบริหารแมตซ์</a></li>
              <li><a href="#" className={stylesCss.footerLink} style={inlineStyles.footerLink}>คำนวณค่าใช้จ่าย</a></li>
              <li><a href="#" className={stylesCss.footerLink} style={inlineStyles.footerLink}>ระบบจัดอันดับ</a></li>
              <li><a href="#" className={stylesCss.footerLink} style={inlineStyles.footerLink}>ภาพรวมก๊วน</a></li>
            </ul>
          </div>
          <div style={inlineStyles.footerSection}>
            <h4 className={stylesCss.footerHeading} style={inlineStyles.footerHeading}>ติดต่อเรา</h4>
            <ul style={inlineStyles.footerList}>
              <li><Mail size={18} style={inlineStyles.footerIcon} /> <a href="playmatch.web@gmail.com" className={stylesCss.footerLink} style={inlineStyles.footerLink}>playmatch.web@gmail.com</a></li>
              <li><Phone size={18} style={inlineStyles.footerIcon} /> <a href="tel:+909989136" className={stylesCss.footerLink} style={inlineStyles.footerLink}>+66 90 998 9136</a></li>
              <li><MapPin size={18} style={inlineStyles.footerIcon} /> 123 ถนนเพลย์แมตช์, เขตสุขสบาย, กรุงเทพมหานคร 10110, ประเทศไทย</li>
            </ul>
          </div>
        </div>
        <div style={inlineStyles.footerBottom}>
          <p style={inlineStyles.footerCopyright}>© 2025 PlayMatch Co., Ltd. All rights reserved.</p>
          <div style={inlineStyles.footerSocialIcons}>
            <a href="#" className={stylesCss.socialIcon} style={inlineStyles.socialIcon}><img src="/images/facebook.png" alt="Facebook" style={{width: '24px', height: '24px'}}/></a>
            <a href="#" className={stylesCss.socialIcon} style={inlineStyles.socialIcon}><img src="/images/line.png" alt="LINE" style={{width: '24px', height: '24px'}}/></a>
            <a href="#" className={stylesCss.socialIcon} style={inlineStyles.socialIcon}><img src="/images/twitter.png" alt="Twitter" style={{width: '24px', height: '24px'}}/></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const inlineStyles = {
  container: {
    fontFamily: '"Kanit", sans-serif',
    backgroundColor: "#1a2a40",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
    color: "#e0e0e0",
  },
  main: {
    flex: 1,
    paddingTop: "75px",
    paddingBottom: "40px",
  },
  heroSection: {
    background: "linear-gradient(135deg, #0f1c30 0%, #3a7bd5 100%)",
    color: "#fff",
    padding: "100px 20px 80px",
    textAlign: "center",
    marginBottom: "60px",
    position: "relative",
    overflow: "hidden",
    borderRadius: "0 0 50% 50% / 10%",
    boxShadow: "0 15px 40px rgba(0,0,0,0.5)",
  },
  heroTitle: {
    fontSize: "3.8rem",
    fontWeight: "800",
    marginBottom: "25px",
    lineHeight: "1.2",
    textShadow: "0 4px 10px rgba(0,0,0,0.6)",
    maxWidth: "900px",
    margin: "0 auto 25px auto",
  },
  heroTitleHighlight: {
    color: "#FFD700",
    background: "linear-gradient(45deg, #FFEB3B, #FFC107)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtitle: {
    fontSize: "1.4rem",
    maxWidth: "800px",
    margin: "0 auto 40px auto",
    opacity: 0.98,
    lineHeight: "1.6",
    textShadow: "0 1px 4px rgba(0,0,0,0.4)",
  },
  startButton: {
    background: "linear-gradient(45deg, #3a7bd5 0%, #00d2ff 100%)",
    color: "#fff",
    border: "none",
    padding: "18px 40px",
    borderRadius: "50px",
    cursor: "pointer",
    fontSize: "1.3rem",
    fontWeight: "700",
    letterSpacing: "0.05em",
    boxShadow: "0 10px 25px rgba(58, 123, 213, 0.5)",
    transition: "all 0.4s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginTop: "20px",
    position: "relative",
    overflow: "hidden",
  },

  featuresSection: {
    padding: "60px 20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  featuresTitle: {
    fontSize: "2.8rem",
    fontWeight: "700",
    color: "#64b5f6",
    textAlign: "center",
    marginBottom: "70px",
    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    marginBottom: "80px",
    padding: "30px",
    borderRadius: "20px",
    backgroundColor: "#2a3b50",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
    color: "#e0e0e0",
  },
  featureImageContainer: {
    flex: 1,
    padding: "20px",
    textAlign: "center",
  },
  featureImage: {
    maxWidth: "100%",
    height: "auto",
    borderRadius: "15px",
    boxShadow: "0 5px 25px rgba(0, 0, 0, 0.3)",
  },
  featureContent: {
    flex: 1.2,
    padding: "20px 30px",
    textAlign: "left",
  },
  featureContentTitle: {
    fontSize: "2.2rem",
    fontWeight: "700",
    color: "#64b5f6",
    marginBottom: "20px",
    position: "relative",
  },
  featureContentDescription: {
    fontSize: "1.1rem",
    lineHeight: "1.8",
    color: "#b0bec5",
    marginBottom: "30px",
  },
  featureLearnMore: {
    color: "#00d2ff",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "1rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    transition: "color 0.3s ease",
  },

  footer: {
    backgroundColor: "#0f1c30",
    color: "#e0e0e0",
    padding: "50px 20px 20px",
    marginTop: "auto",
    borderTop: "5px solid #3a7bd5",
  },
  footerContent: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "30px",
    maxWidth: "1200px",
    margin: "0 auto 40px auto",
    paddingBottom: "30px",
    borderBottom: "1px solid rgba(255,255,255,0.15)",
  },
  footerSection: {
    textAlign: "left",
  },
  footerLogo: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
  },
  footerBrandName: {
    fontSize: "2.2rem",
    fontWeight: "800",
    marginLeft: "10px",
  },
  footerAbout: {
    fontSize: "0.95rem",
    lineHeight: "1.6",
    color: "#b0bec5",
  },
  footerHeading: {
    fontSize: "1.3rem",
    fontWeight: "700",
    marginBottom: "20px",
    color: "#00d2ff",
    position: "relative",
  },
  footerList: {
    listStyle: "none",
    padding: 0,
  },
  footerLink: {
    color: "#b0bec5",
    textDecoration: "none",
    fontSize: "0.9rem",
    lineHeight: "2.2",
    display: "flex",
    alignItems: "center",
    transition: "color 0.3s ease",
  },
  footerIcon: {
    marginRight: "10px",
    color: "#00d2ff",
  },
  footerBottom: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    paddingTop: "20px",
  },
  footerCopyright: {
    fontSize: "0.85rem",
    color: "#8899a6",
    margin: "10px 0",
  },
  footerSocialIcons: {
    display: "flex",
    gap: "15px",
    margin: "10px 0",
  },
  socialIcon: {
    display: "block",
    transition: "transform 0.3s ease",
  },
};

export default IndexPage;
