import React, { useState, useRef } from "react";
import Head from "next/head";
import Navbar from "./components/navbar";
import { useInView } from "react-intersection-observer";
import { ChevronDown } from "lucide-react";

// URL ของ Line Official Account
const LINE_OA_URL = "https://page.line.me/136rjkgt";

const packageData = [
  {
    name: "ก๊วนเล็ก",
    description: "เหมาะสำหรับก๊วนเพื่อน, ก๊วนครอบครัว",
    features: [
      "สมาชิกก๊วนสูงสุด 40 คน",
      "จัด Match ได้ไม่เกิน 30 Match ต่อเดือน",
      "ระบบแจ้งเตือน Match",
      "บันทึกผลการแข่งขัน",
      "สถิติพื้นฐาน",
    ],
    monthlyPrice: "149",
    yearlyPrice: "1,490",
    yearlyDiscountText: "ประหยัดกว่า 188 บาท/ปี",
    buttonText: "เริ่มต้นเลย",
    isPopular: false,
    buttonVariant: "primary-outline",
  },
  {
    name: "ก๊วนมาตรฐาน",
    description: "เหมาะสำหรับก๊วนประจำ, ชมรมขนาดกลาง",
    features: [
      "สมาชิกก๊วนสูงสุด 100 คน",
      "จัด Match ได้ไม่เกิน 70 Match ต่อเดือน",
      "ระบบแจ้งเตือนและยืนยัน Match",
      "บันทึกผลการแข่งขันขั้นสูง",
      "สถิติและกราฟวิเคราะห์",
      "ระบบจัดอันดับสมาชิก (Ranking)",
    ],
    monthlyPrice: "299",
    yearlyPrice: "2,990",
    yearlyDiscountText: "ประหยัดกว่า 588 บาท/ปี",
    buttonText: "เลือกแพ็กเกจนี้!",
    isPopular: true,
    buttonVariant: "primary-filled",
  },
  {
    name: "ก๊วนใหญ่/พรีเมียม",
    description: "เหมาะสำหรับชมรมขนาดใหญ่, ผู้จัดประจำ",
    features: [
      "สมาชิกก๊วนไม่จำกัด",
      "จัด Match ไม่จำกัด (ฟีเจอร์ทั้งหมด)",
      "ผู้ช่วยส่วนตัวสำหรับการตั้งค่า",
      "ปรับแต่งแอปตามแบรนด์ของคุณ",
      "รองรับการเชื่อมต่อ API (Custom Integration)",
      "สิทธิพิเศษเข้าร่วมงาน PlayMatch Exclusive",
    ],
    monthlyPrice: "599",
    yearlyPrice: "5,990",
    yearlyDiscountText: "ประหยัดกว่า 1,188 บาท/ปี",
    buttonText: "ติดต่อทีมงาน",
    isPopular: false,
    buttonVariant: "primary-outline",
  },
];

const faqData = [
  {
    question: "แพ็กเกจรายปีคุ้มค่ากว่าแพ็กเกจรายเดือนอย่างไร?",
    answer:
      "แพ็กเกจรายปีจะได้รับส่วนลดพิเศษ เทียบเท่ากับการใช้งานฟรี 1-2 เดือนเมื่อเทียบกับการชำระรายเดือนครับ",
  },
  {
    question:
      "หากจำนวนสมาชิกก๊วนหรือจำนวน Match เกินกว่าที่ระบุในแพ็กเกจ จะเกิดอะไรขึ้น?",
    answer:
      "ระบบจะแจ้งเตือนและแนะนำให้ท่านพิจารณาอัปเกรดแพ็กเกจเพื่อให้การใช้งานต่อเนื่องได้ไม่สะดุด",
  },
  {
    question: "สามารถเปลี่ยนแพ็กเกจได้ในภายหลังหรือไม่?",
    answer:
      "ท่านสามารถอัปเกรดแพ็กเกจได้ตลอดเวลา โดยส่วนต่างของค่าบริการจะถูกปรับตามสัดส่วนที่เหลือ หากต้องการดาวน์เกรดแพ็กเกจ จะมีผลในรอบบิลถัดไป",
  },
  {
    question: "มีวิธีการชำระเงินแบบใดบ้าง?",
    answer:
      "เรารองรับการชำระเงินผ่านบัตรเครดิต/เดบิต, การโอนเงินผ่านธนาคาร, และพร้อมเพย์",
  },
  {
    question: "หากมีปัญหาในการใช้งานแพ็กเกจ จะติดต่อขอความช่วยเหลือได้อย่างไร?",
    answer:
      "ท่านสามารถติดต่อทีมงานของเราได้ผ่านทางอีเมล support@playmatch.com หรือโทรศัพท์ 0xx-xxx-xxxx ในเวลาทำการ",
  },
];

// Component สำหรับ FAQ Item แบบ Expand/Collapse
const FAQItem = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true, // Trigger animation only once
    threshold: 0.1, // Element is 10% visible
    delay: index * 100, // Delay animation based on index
  });

  return (
    <div
      ref={ref}
      style={{
        ...styles.faqItem,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${index * 0.1}s`, // Stagger delay for FAQ items
      }}
    >
      <button
        style={styles.faqQuestionButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 style={styles.faqQuestion}>{question}</h4>
        <ChevronDown
          size={24}
          style={{
            ...styles.faqIcon,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {isOpen && <p style={styles.faqAnswer}>{answer}</p>}
    </div>
  );
};

function Packages() {
  // ฟังก์ชันสำหรับเปิด Line OA
  const handleButtonClick = () => {
    window.open(LINE_OA_URL, "_blank"); // เปิดในแท็บใหม่
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>แพ็กเกจการสมัคร - PlayMatch</title>
        <meta
          name="description"
          content="เลือกแพ็กเกจ PlayMatch ที่เหมาะกับคุณ"
        />
      </Head>

      <Navbar />

      <main style={styles.main}>
        <section style={styles.heroSection}>
          <h1 style={styles.heroTitle}>
            เลือก <span style={styles.heroTitleHighlight}>แพ็กเกจ</span> ที่ใช่
            สำหรับ <span style={styles.heroTitleHighlight}>PlayMatch</span>{" "}
            ของคุณ
          </h1>
          <p style={styles.heroSubtitle}>
            พบกับแพ็กเกจหลากหลายที่ออกแบบมาเพื่อตอบสนองทุกความต้องการของก๊วนและชมรมของคุณ
          </p>
        </section>

        <section style={styles.pricingSection}>
          <div style={styles.pricingGrid}>
            {packageData.map((pkg, index) => {
              const { ref, inView } = useInView({
                triggerOnce: true,
                threshold: 0.2,
              });

              return (
                <div
                  key={index}
                  ref={ref}
                  style={{
                    ...styles.packageCard,
                    ...(pkg.isPopular ? styles.popularPackage : {}),
                    opacity: inView ? 1 : 0,
                    transform: inView ? "translateY(0)" : "translateY(50px)",
                    transition: `opacity 0.6s ease-out ${
                      index * 0.15
                    }s, transform 0.6s ease-out ${index * 0.15}s`,
                  }}
                >
                  {pkg.isPopular && (
                    <div style={styles.popularBadge}>👑 ยอดนิยม</div>
                  )}
                  <h3 style={styles.packageTitle}>{pkg.name}</h3>
                  <p style={styles.packageDescription}>{pkg.description}</p>
                  <div style={styles.priceContainer}>
                    <div style={styles.monthlyPrice}>
                      <span style={styles.priceCurrency}>฿</span>
                      <span style={styles.priceValue}>{pkg.monthlyPrice}</span>
                      <span style={styles.priceUnit}>/เดือน</span>
                    </div>
                    <div style={styles.yearlyPrice}>
                      หรือ{" "}
                      <span style={styles.yearlyPriceValue}>
                        ฿{pkg.yearlyPrice}
                      </span>
                      /ปี
                      <p style={styles.discountText}>
                        {pkg.yearlyDiscountText}
                      </p>
                    </div>
                  </div>
                  <ul style={styles.featureList}>
                    {pkg.features.map((feature, i) => (
                      <li key={i} style={styles.featureItem}>
                        ✔️ {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    style={
                      pkg.buttonVariant === "primary-filled"
                        ? styles.selectButtonFilled
                        : styles.selectButtonOutline
                    }
                    onClick={handleButtonClick} // เพิ่ม onClick handler ที่นี่
                  >
                    {pkg.buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section style={styles.faqSection}>
          <h2 style={styles.faqTitle}>คำถามที่พบบ่อย</h2>
          <div style={styles.faqGrid}>
            {faqData.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                index={index}
              />
            ))}
          </div>
        </section>
      </main>

      {/* <Footer /> */}
    </div>
  );
}

// Inline Styles (เหมือนเดิมจากเวอร์ชันก่อนหน้า)
const styles = {
  container: {
    fontFamily: '"Kanit", sans-serif',
    backgroundColor: "#f0f8ff",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
  },
  main: {
    flex: 1,
    paddingTop: "75px",
    paddingBottom: "40px",
  },
  heroSection: {
    background: "#1c315e",
    color: "#fff",
    padding: "80px 20px 60px",
    textAlign: "center",
    marginBottom: "50px",
    position: "relative",
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: "3.2rem",
    fontWeight: "700",
    marginBottom: "20px",
    lineHeight: "1.3",
    textShadow: "0 3px 6px rgba(0,0,0,0.4)",
  },
  heroTitleHighlight: {
    color: "#64b5f6",
  },
  heroSubtitle: {
    fontSize: "1.3rem",
    maxWidth: "800px",
    margin: "0 auto",
    opacity: 0.9,
  },
  heroIllustration: {
    maxWidth: "400px",
    height: "auto",
    marginTop: "40px",
    filter: "drop-shadow(0 5px 15px rgba(0,0,0,0.3))",
  },
  pricingSection: {
    padding: "20px",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "35px",
    maxWidth: "1200px",
    margin: "0 auto",
    alignItems: "stretch",
  },
  packageCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
    padding: "35px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
    cursor: "pointer", // ตรวจสอบให้แน่ใจว่ามี cursor pointer
  },
  "packageCard:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.2)",
  },
  popularPackage: {
    border: "3px solid #64b5f6",
    transform: "scale(1.04)",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    zIndex: 2,
  },
  popularBadge: {
    position: "absolute",
    top: "0px",
    right: "0px",
    backgroundColor: "#64b5f6",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "0 12px 0 12px",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  packageTitle: {
    fontSize: "2.1rem",
    fontWeight: "700",
    color: "#1c315e",
    marginBottom: "10px",
  },
  packageDescription: {
    color: "#546e7a",
    marginBottom: "20px",
    minHeight: "50px",
  },
  priceContainer: {
    marginBottom: "25px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  monthlyPrice: {
    display: "flex",
    alignItems: "flex-end",
    color: "#1c315e",
    marginBottom: "5px",
  },
  priceCurrency: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginRight: "5px",
  },
  priceValue: {
    fontSize: "3.2rem",
    fontWeight: "800",
    lineHeight: "1",
  },
  priceUnit: {
    fontSize: "1.1rem",
    marginLeft: "5px",
    color: "#546e7a",
  },
  yearlyPrice: {
    fontSize: "1rem",
    color: "#546e7a",
    fontWeight: "500",
  },
  yearlyPriceValue: {
    fontWeight: "700",
    color: "#1c315e",
  },
  discountText: {
    fontSize: "0.9rem",
    color: "#2e7d32",
    fontWeight: "600",
    marginTop: "5px",
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    marginBottom: "25px",
    width: "100%",
  },
  featureItem: {
    padding: "10px 20px",
    color: "#37474f",
    borderBottom: "1px solid #eceff1",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "0.95rem",
  },
  "featureItem:last-child": {
    borderBottom: "none",
  },
  selectButtonFilled: {
    background: "#64b5f6",
    color: "#fff",
    border: "none",
    padding: "14px 35px",
    borderRadius: "30px",
    cursor: "pointer", // ตรวจสอบให้แน่ใจว่ามี cursor pointer
    fontSize: "1.05rem",
    fontWeight: "600",
    letterSpacing: "0.03em",
    boxShadow: "0 4px 10px rgba(100, 181, 246, 0.4)",
    transition: "all 0.3s ease",
    marginTop: "auto",
    minWidth: "180px",
  },
  "selectButtonFilled:hover": {
    backgroundColor: "#42a5f5",
    boxShadow: "0 6px 15px rgba(100, 181, 246, 0.6)",
    transform: "translateY(-2px)",
  },
  selectButtonOutline: {
    background: "none",
    color: "#64b5f6",
    border: "2px solid #64b5f6",
    padding: "12px 33px",
    borderRadius: "30px",
    cursor: "pointer", // ตรวจสอบให้แน่ใจว่ามี cursor pointer
    fontSize: "1.05rem",
    fontWeight: "600",
    letterSpacing: "0.03em",
    transition: "all 0.3s ease",
    marginTop: "auto",
    minWidth: "180px",
  },
  "selectButtonOutline:hover": {
    background: "#64b5f6",
    color: "#fff",
    boxShadow: "0 4px 10px rgba(100, 181, 246, 0.4)",
    transform: "translateY(-2px)",
  },

  // FAQ Section Styles
  faqSection: {
    backgroundColor: "#fff",
    padding: "60px 20px",
    textAlign: "center",
    marginTop: "50px",
    boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
  },
  faqTitle: {
    fontSize: "2.4rem",
    fontWeight: "700",
    color: "#1c315e",
    marginBottom: "40px",
  },
  faqGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    maxWidth: "900px",
    margin: "0 auto",
    textAlign: "left",
  },
  faqItem: {
    backgroundColor: "#f9fbfd",
    borderRadius: "10px",
    border: "1px solid #e0f2f7",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
    opacity: 0,
    transform: "translateY(20px)",
  },
  faqQuestionButton: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "20px 25px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  faqQuestion: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1c315e",
    margin: 0,
  },
  faqIcon: {
    color: "#64b5f6",
    transition: "transform 0.3s ease",
  },
  faqAnswer: {
    padding: "10px 25px 20px",
    color: "#546e7a",
    lineHeight: "1.7",
    fontSize: "0.95rem",
    backgroundColor: "#eff7fd",
    borderTop: "1px solid #e0f2f7",
  },
  // Responsive adjustments
  "@media (max-width: 768px)": {
    heroTitle: {
      fontSize: "2.5rem",
    },
    heroSubtitle: {
      fontSize: "1.1rem",
    },
    packageCard: {
      padding: "25px",
    },
    priceValue: {
      fontSize: "2.8rem",
    },
    selectButtonFilled: {
      padding: "10px 25px",
      fontSize: "0.95rem",
    },
    selectButtonOutline: {
      padding: "8px 23px",
      fontSize: "0.95rem",
    },
    faqTitle: {
      fontSize: "2rem",
    },
    faqQuestion: {
      fontSize: "1rem",
    },
    faqAnswer: {
      fontSize: "0.9rem",
    },
  },
  "@media (max-width: 480px)": {
    heroTitle: {
      fontSize: "2rem",
    },
    packageCard: {
      padding: "20px",
    },
    priceValue: {
      fontSize: "2.5rem",
    },
  },
};

export default Packages;
