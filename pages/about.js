import React from "react";
import Head from "next/head";
import Navbar from "./components/navbar"; // สมมติว่า Navbar อยู่ใน components โฟลเดอร์เดียวกัน
import { useInView } from "react-intersection-observer"; // Import useInView

// URL ของ Line Official Account
const LINE_OA_URL = "https://page.line.me/136rjkgt";

// Component สำหรับ Section ที่มี Animation
const AnimatedSection = ({ children, delay = 0, style, ...props }) => {
  const { ref, inView } = useInView({
    triggerOnce: true, // Trigger animation only once
    threshold: 0.1, // Element is 10% visible
  });

  return (
    <section
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(50px)",
        transition: `opacity 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s, transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s`,
        ...style,
      }}
      {...props}
    >
      {children}
    </section>
  );
};

// Component สำหรับ Card ที่มี Animation
const AnimatedCard = ({ children, delay = 0, style, ...props }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "scale(1)" : "scale(0.9)",
        transition: `opacity 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s, transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

function About() {
  return (
    <div style={styles.container}>
      <Head>
        <title>เกี่ยวกับเรา - PlayMatch</title>
        <meta
          name="description"
          content="เรื่องราว, วิสัยทัศน์, และพันธกิจของ PlayMatch แพลตฟอร์มสำหรับคนรักกีฬา"
        />
      </Head>

      <Navbar />

      <main style={styles.main}>
        {/* Hero Section */}
        <AnimatedSection style={styles.heroSection} delay={0.1}>
          <div style={styles.heroOverlay}></div> {/* เพิ่ม overlay เพื่อทำให้ข้อความอ่านง่ายขึ้น */}
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              เรื่องราวของ <span style={styles.heroTitleHighlight}>PlayMatch</span>
            </h1>
            <p style={styles.heroSubtitle}>
              จากความหลงใหลในกีฬา สู่แพลตฟอร์มที่เชื่อมโยงทุกคนเข้าด้วยกันอย่างง่ายดาย
            </p>
          </div>
        </AnimatedSection>

        {/* Who We Are Section */}
        <AnimatedSection style={styles.section} delay={0.2}>
          <div style={styles.contentWrapper}>
            <h2 style={styles.sectionTitle}>
              เราคือ <span style={styles.sectionTitleHighlight}>ใคร</span>?
            </h2>
            <p style={styles.paragraph}>
              PlayMatch ถือกำเนิดขึ้นจากความเข้าใจอย่างลึกซึ้งถึงความท้าทายของคนรักกีฬา
              ไม่ว่าจะเป็นการค้นหาเพื่อนร่วมทีม, จัดการตารางการแข่งขันที่ซับซ้อน,
              หรือการติดตามผลลัพธ์เพื่อพัฒนาทักษะ
              เราคือทีมงานที่มีความมุ่งมั่นและหลงใหลในกีฬา
              มารวมตัวกันเพื่อสร้างสรรค์แพลตฟอร์มที่ตอบโจทย์ความต้องการเหล่านี้
            </p>
            <p style={styles.paragraph}>
              เราเชื่อว่าการเล่นกีฬาควรเป็นเรื่องง่าย สนุก และเข้าถึงได้สำหรับทุกคน
              ไม่ว่าคุณจะเป็นนักกีฬามืออาชีพ, ก๊วนเพื่อนที่รวมตัวกันประจำ,
              หรือเพียงแค่ต้องการออกกำลังกายเพื่อสุขภาพที่ดี PlayMatch พร้อมเป็นเครื่องมือสำคัญ
              ที่จะช่วยให้คุณได้ใช้เวลากับสิ่งที่รักได้อย่างเต็มที่
            </p>
          </div>
        </AnimatedSection>

        {/* Vision & Mission Section */}
        <AnimatedSection style={{ ...styles.section, ...styles.darkSection }} delay={0.3}>
          <div style={styles.contentWrapper}>
            <h2 style={{ ...styles.sectionTitle, color: "#fff" }}>
              วิสัยทัศน์และ <span style={styles.sectionTitleHighlight}>พันธกิจ</span>
            </h2>
            <div style={styles.visionMissionGrid}>
              <AnimatedCard delay={0.4} style={styles.visionMissionCard}>
                <img src="/images/icon-vision.png" alt="Vision Icon" style={styles.cardIcon} />
                <h3 style={styles.cardTitle}>วิสัยทัศน์ของเรา</h3>
                <p style={styles.cardText}>
                  มุ่งสู่การเป็นแพลตฟอร์มอันดับหนึ่งที่เชื่อมโยงและเสริมสร้างชุมชนกีฬาให้แข็งแกร่ง
                  นำเสนอประสบการณ์การเล่นกีฬาที่เหนือกว่าผ่านนวัตกรรมที่ต่อเนื่อง
                </p>
              </AnimatedCard>
              <AnimatedCard delay={0.5} style={styles.visionMissionCard}>
                <img src="/images/icon-mission.png" alt="Mission Icon" style={styles.cardIcon} />
                <h3 style={styles.cardTitle}>พันธกิจของเรา</h3>
                <p style={styles.cardText}>
                  พัฒนาและส่งมอบเครื่องมือที่ใช้งานง่ายและมีประสิทธิภาพ
                  เพื่อช่วยให้ผู้ใช้สามารถจัด Match กีฬา, ค้นหาผู้เล่น,
                  และจัดการกิจกรรมได้อย่างราบรื่นและสนุกสนานที่สุด
                </p>
              </AnimatedCard>
            </div>
          </div>
        </AnimatedSection>

        {/* What We Do Section */}
        <AnimatedSection style={styles.section} delay={0.6}>
          <div style={styles.contentWrapper}>
            <h2 style={styles.sectionTitle}>
              เรา <span style={styles.sectionTitleHighlight}>ทำ</span> อะไรบ้าง?
            </h2>
            <div style={styles.whatWeDoGrid}>
              <AnimatedCard delay={0.7} style={styles.whatWeDoItem}>
                <img src="/images/icon-match.png" alt="Match Icon" style={styles.whatWeDoIcon} />
                <h4 style={styles.whatWeDoTitle}>จัดการ Match ได้ทุกประเภท</h4>
                <p style={styles.whatWeDoDescription}>
                  ไม่ว่าจะเป็นฟุตบอล, บาสเกตบอล, แบดมินตัน หรือกีฬาอื่นๆ
                  คุณก็สามารถสร้างและจัดการ Match ได้อย่างรวดเร็ว
                </p>
              </AnimatedCard>
              <AnimatedCard delay={0.8} style={styles.whatWeDoItem}>
                <img src="/images/icon-community.png" alt="Community Icon" style={styles.whatWeDoIcon} />
                <h4 style={styles.whatWeDoTitle}>สร้างและขยายก๊วนของคุณ</h4>
                <p style={styles.whatWeDoDescription}>
                  ค้นหาผู้เล่นใหม่ๆ ที่มีระดับฝีมือใกล้เคียงกัน
                  และสร้างชุมชนกีฬาที่เป็นกันเองและอบอุ่น
                </p>
              </AnimatedCard>
              <AnimatedCard delay={0.9} style={styles.whatWeDoItem}>
                <img src="/images/icon-stats.png" alt="Stats Icon" style={styles.whatWeDoIcon} />
                <h4 style={styles.whatWeDoTitle}>สถิติและการวิเคราะห์</h4>
                <p style={styles.whatWeDoDescription}>
                  บันทึกผลการแข่งขัน, ติดตามสถิติส่วนตัวและทีม
                  เพื่อวิเคราะห์และพัฒนาศักยภาพการเล่นของคุณ
                </p>
              </AnimatedCard>
            </div>
          </div>
        </AnimatedSection>

        {/* Call to Action Section */}
        <AnimatedSection style={{ ...styles.section, ...styles.ctaSection }} delay={1.0}>
          <h2 style={styles.ctaTitle}>
            พร้อมที่จะยกระดับประสบการณ์กีฬาของคุณแล้วหรือยัง?
          </h2>
          <button
            style={styles.ctaButton}
            onClick={() => window.open(LINE_OA_URL, "_blank")}
          >
            เริ่มต้นกับ PlayMatch วันนี้
          </button>
        </AnimatedSection>
      </main>

      {/* <Footer /> */}
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    fontFamily: '"Kanit", sans-serif',
    backgroundColor: "#fcfdff", // พื้นหลังสีขาวนวลที่ดูแพงขึ้น
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden", // ป้องกัน scrollbar แนวตั้งที่อาจเกิดจาก Animation
    color: "#333", // สีข้อความเริ่มต้น
  },
  main: {
    flex: 1,
    paddingTop: "75px", // ปรับตามความสูงของ Navbar
    paddingBottom: "60px",
  },
  // Hero Section
  heroSection: {
    background: `linear-gradient(rgba(28, 49, 94, 0.7), rgba(28, 49, 94, 0.7)), url('/images/about-hero.jpg') center/cover no-repeat`, // เพิ่ม overlay ใน background
    color: "#fff",
    padding: "120px 20px", // เพิ่ม padding ให้ดูโปร่งขึ้น
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    marginBottom: "80px",
    borderRadius: "0 0 40px 40px", // โค้งมนด้านล่างมากขึ้น
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "550px", // กำหนดความสูงขั้นต่ำ
  },
  heroOverlay: { // แยก overlay ออกมาเพื่อควบคุม opacity
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(28, 49, 94, 0.6)", // Overlay สีน้ำเงินเข้มโปร่งแสง
    zIndex: 1,
  },
  heroContent: {
    position: "relative",
    zIndex: 2, // ให้เนื้อหาอยู่บน overlay
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 20px",
  },
  heroTitle: {
    fontSize: "4.5rem", // ขนาดใหญ่ขึ้น
    fontWeight: "900", // หนาขึ้น
    marginBottom: "25px",
    lineHeight: "1.1",
    textShadow: "0 5px 15px rgba(0,0,0,0.6)",
  },
  heroTitleHighlight: {
    color: "#64b5f6", // สีฟ้ากลางๆ
  },
  heroSubtitle: {
    fontSize: "1.7rem", // ขนาดใหญ่ขึ้น
    maxWidth: "750px",
    margin: "0 auto",
    opacity: 0.95,
    lineHeight: "1.5",
    fontWeight: "300", // บางลงเพื่อให้ตัดกับ title
  },

  // General Section Styles
  section: {
    padding: "100px 20px", // เพิ่ม padding
    textAlign: "center",
    position: "relative",
  },
  darkSection: {
    backgroundColor: "#1c315e", // สีน้ำเงินเข้ม
    color: "#fff",
    padding: "100px 20px",
    borderRadius: "20px", // เพิ่มความโค้งมน
    margin: "0 auto", // จัดกลาง
    maxWidth: "1200px", // กำหนดความกว้าง
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  contentWrapper: {
    maxWidth: "1000px",
    margin: "0 auto",
  },
  sectionTitle: {
    fontSize: "3.8rem", // ขนาดใหญ่ขึ้น
    fontWeight: "800",
    color: "#1c315e",
    marginBottom: "50px", // เพิ่มระยะห่าง
    position: "relative",
    // borderBottom: "4px solid #64b5f6", // อาจจะเพิ่มเส้นใต้
    // paddingBottom: "15px",
  },
  sectionTitleHighlight: {
    color: "#64b5f6",
  },
  paragraph: {
    fontSize: "1.3rem", // ขนาดใหญ่ขึ้น
    lineHeight: "1.9",
    color: "#555", // สีเทาเข้มขึ้นเล็กน้อย
    marginBottom: "30px",
    maxWidth: "850px", // กว้างขึ้น
    margin: "0 auto 30px",
    fontWeight: "300", // บางลง
  },

  // Vision & Mission Section
  visionMissionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", // กว้างขึ้น
    gap: "50px", // เพิ่มระยะห่าง
    marginTop: "60px",
  },
  visionMissionCard: {
    background: "rgba(255, 255, 255, 0.1)", // Background โปร่งแสง
    borderRadius: "20px", // โค้งมนมากขึ้น
    padding: "45px", // เพิ่ม padding
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)", // เงาชัดขึ้น
    backdropFilter: "blur(10px)", // Blur มากขึ้น
    border: "1px solid rgba(255,255,255,0.4)", // ขอบขาวโปร่งแสงชัดขึ้น
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.4s ease",
  },
  "visionMissionCard:hover": {
    transform: "translateY(-15px)", // ยกสูงขึ้นเมื่อ hover
    background: "rgba(255, 255, 255, 0.25)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.4)", // เงาเข้มขึ้น
  },
  cardIcon: {
    width: "80px", // ขนาดไอคอน
    height: "80px",
    marginBottom: "30px", // เพิ่มระยะห่าง
    filter: "drop-shadow(0 6px 15px rgba(0,0,0,0.3))", // เงาไอคอน
  },
  cardTitle: {
    fontSize: "2.5rem", // ขนาดใหญ่ขึ้น
    fontWeight: "700",
    color: "#81d4fa", // สีฟ้าอ่อน
    marginBottom: "20px",
    letterSpacing: "0.03em",
  },
  cardText: {
    fontSize: "1.25rem", // ขนาดใหญ่ขึ้น
    lineHeight: "1.8",
    color: "#e3f2fd", // สีขาวอมฟ้าอ่อน
    fontWeight: "300",
  },

  // What We Do Section
  whatWeDoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "40px", // เพิ่มระยะห่าง
    marginTop: "60px",
  },
  whatWeDoItem: {
    backgroundColor: "#fff",
    borderRadius: "20px", // โค้งมนมากขึ้น
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
    padding: "40px", // เพิ่ม padding
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease",
    border: "1px solid #e9eff5", // ขอบที่ละเอียดขึ้น
  },
  "whatWeDoItem:hover": {
    transform: "translateY(-12px)", // ยกสูงขึ้น
    boxShadow: "0 18px 45px rgba(0, 0, 0, 0.15)", // เงาเข้มขึ้น
  },
  whatWeDoIcon: {
    width: "100px", // ขนาดไอคอนใหญ่ขึ้น
    height: "100px",
    marginBottom: "30px", // เพิ่มระยะห่าง
  },
  whatWeDoTitle: {
    fontSize: "2rem", // ขนาดใหญ่ขึ้น
    fontWeight: "700",
    color: "#1c315e",
    marginBottom: "18px",
  },
  whatWeDoDescription: {
    fontSize: "1.15rem", // ขนาดใหญ่ขึ้น
    color: "#666", // สีเทาเข้ม
    lineHeight: "1.7",
    fontWeight: "300",
  },

  // Call to Action Section
  ctaSection: {
    background: "linear-gradient(45deg, #1e88e5 0%, #42a5f5 100%)", // Gradient สีฟ้าที่สดใสและเข้มขึ้น
    padding: "120px 20px", // เพิ่ม padding
    marginTop: "100px",
    borderRadius: "30px", // โค้งมนมากขึ้น
    margin: "100px auto 0",
    maxWidth: "1200px",
    boxShadow: "0 20px 50px rgba(0, 150, 255, 0.35)", // เงาที่ชัดเจนและสีน้ำเงิน
  },
  ctaTitle: {
    fontSize: "3.5rem", // ขนาดใหญ่ขึ้น
    fontWeight: "900", // หนาขึ้น
    color: "#fff",
    marginBottom: "60px", // เพิ่มระยะห่าง
    maxWidth: "900px",
    margin: "0 auto 60px",
    textShadow: "0 4px 10px rgba(0,0,0,0.4)",
  },
  ctaButton: {
    background: "#1c315e", // สีน้ำเงินเข้มจาก theme
    color: "#fff",
    border: "none",
    padding: "22px 60px", // ขนาดใหญ่ขึ้น
    fontSize: "1.5rem", // ขนาดตัวอักษรใหญ่ขึ้น
    borderRadius: "40px", // โค้งมนมากขึ้น
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)", // เงาชัดขึ้น
    transition: "all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
    letterSpacing: "0.03em",
  },
  "ctaButton:hover": {
    background: "#2a4a82", // เข้มขึ้นเมื่อ hover
    boxShadow: "0 15px 45px rgba(0, 0, 0, 0.4)", // เงาเข้มขึ้น
    transform: "translateY(-8px)", // ยกสูงขึ้น
  },

  // Responsive adjustments (ปรับขนาดตัวอักษรและ padding เพิ่มเติม)
  "@media (max-width: 1024px)": {
    heroSection: {
      padding: "80px 20px",
      minHeight: "450px",
      marginBottom: "60px",
    },
    heroTitle: {
      fontSize: "3.5rem",
    },
    heroSubtitle: {
      fontSize: "1.4rem",
    },
    section: {
      padding: "80px 20px",
    },
    sectionTitle: {
      fontSize: "3rem",
    },
    paragraph: {
      fontSize: "1.15rem",
    },
    visionMissionGrid: {
      gridTemplateColumns: "1fr",
      gap: "30px",
    },
    visionMissionCard: {
      padding: "35px",
    },
    whatWeDoGrid: {
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "30px",
    },
    whatWeDoItem: {
      padding: "35px",
    },
    ctaSection: {
      padding: "100px 20px",
    },
    ctaTitle: {
      fontSize: "2.8rem",
    },
    ctaButton: {
      padding: "18px 45px",
      fontSize: "1.2rem",
    },
  },
  "@media (max-width: 768px)": {
    main: {
      paddingTop: "65px",
    },
    heroSection: {
      padding: "60px 15px",
      minHeight: "400px",
      marginBottom: "40px",
      borderRadius: "0 0 30px 30px",
    },
    heroTitle: {
      fontSize: "2.8rem",
    },
    heroSubtitle: {
      fontSize: "1.2rem",
    },
    section: {
      padding: "60px 15px",
    },
    darkSection: {
      padding: "80px 15px",
      borderRadius: "15px",
    },
    sectionTitle: {
      fontSize: "2.4rem",
      marginBottom: "30px",
    },
    paragraph: {
      fontSize: "1rem",
      marginBottom: "20px",
    },
    visionMissionCard: {
      padding: "30px",
    },
    cardIcon: {
      width: "60px",
      height: "60px",
      marginBottom: "20px",
    },
    cardTitle: {
      fontSize: "2rem",
    },
    cardText: {
      fontSize: "1.1rem",
    },
    whatWeDoGrid: {
      gridTemplateColumns: "1fr", // Stack on smaller screens
    },
    whatWeDoItem: {
      padding: "30px",
    },
    whatWeDoIcon: {
      width: "80px",
      height: "80px",
      marginBottom: "20px",
    },
    whatWeDoTitle: {
      fontSize: "1.8rem",
    },
    whatWeDoDescription: {
      fontSize: "1rem",
    },
    ctaSection: {
      padding: "80px 15px",
      marginTop: "60px",
      borderRadius: "20px",
    },
    ctaTitle: {
      fontSize: "2.2rem",
      marginBottom: "50px",
    },
    ctaButton: {
      padding: "16px 35px",
      fontSize: "1.1rem",
    },
  },
  "@media (max-width: 480px)": {
    heroSection: {
      padding: "40px 10px",
      minHeight: "350px",
      marginBottom: "30px",
      borderRadius: "0 0 20px 20px",
    },
    heroTitle: {
      fontSize: "2rem",
      marginBottom: "15px",
    },
    heroSubtitle: {
      fontSize: "0.95rem",
    },
    section: {
      padding: "40px 10px",
    },
    darkSection: {
      padding: "50px 10px",
      borderRadius: "10px",
    },
    sectionTitle: {
      fontSize: "1.8rem",
      marginBottom: "25px",
    },
    paragraph: {
      fontSize: "0.9rem",
      marginBottom: "15px",
    },
    visionMissionGrid: {
      gap: "25px",
    },
    visionMissionCard: {
      padding: "25px",
    },
    cardIcon: {
      width: "50px",
      height: "50px",
      marginBottom: "15px",
    },
    cardTitle: {
      fontSize: "1.6rem",
    },
    cardText: {
      fontSize: "0.9rem",
    },
    whatWeDoItem: {
      padding: "25px",
    },
    whatWeDoIcon: {
      width: "70px",
      height: "70px",
    },
    whatWeDoTitle: {
      fontSize: "1.5rem",
    },
    whatWeDoDescription: {
      fontSize: "0.85rem",
    },
    ctaSection: {
      padding: "60px 10px",
      marginTop: "40px",
      borderRadius: "15px",
    },
    ctaTitle: {
      fontSize: "1.8rem",
      marginBottom: "30px",
    },
    ctaButton: {
      padding: "14px 28px",
      fontSize: "0.95rem",
    },
  },
};

export default About;
