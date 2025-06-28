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
      "สมาชิกก๊วนสูงสุด 60 คน",
      "จัด Match ได้ไม่เกิน 15 Match ต่อเดือน",
      "ระบบเช็คชื่อสมาชิก",
      "สร้าง Matches ประจำวัน",
      "บันทึกผลการแข่งขัน",
      "คำนวณค่าใช้จ่ายของสมาชิก",
      "สถิติและกราฟวิเคราะห์",
    ],
    monthlyPrice: "259",
    yearlyPrice: "2,590",
    yearlyDiscountText: "ประหยัดกว่า 518 บาท/ปี",
    buttonText: "เริ่มต้นเลย",
    isPopular: false,
    buttonVariant: "primary-outline",
    isSale: false,
    badgeText: "แนะนำ",
    cardType: "standard", // กำหนดประเภทของการ์ด
  },
  {
    name: "ก๊วนมาตรฐาน",
    description: "เหมาะสำหรับก๊วนประจำ, ชมรมขนาดกลาง",
    features: [
      "สมาชิกก๊วนสูงสุด 200 คน",
      "จัด Match ได้ไม่เกิน 40 Match ต่อเดือน",
      "ระบบเช็คชื่อสมาชิก",
      "สร้าง Matches ประจำวัน",
      "บันทึกผลการแข่งขันขั้นสูง",
      "คำนวณค่าใช้จ่ายของสมาชิกขั้นสูง",
      "ระบบแจ้งเตือนวันเกิดสมาชิก",
      "สถิติและกราฟวิเคราะห์",
      "ระบบจัดอันดับสมาชิก (Ranking)",
    ],
    monthlyPrice: "299", // ราคาลดแล้ว
    originalMonthlyPrice: "399", // ราคาเดิมรายเดือนสำหรับขีดฆ่า
    yearlyPrice: "2,990", // ราคาใหม่รายปีที่ลดแล้ว
    originalYearlyPrice: "3,990", // ราคาเดิมรายปีสำหรับขีดฆ่า
    yearlyDiscountText: "ประหยัดกว่า 1,798 บาท/ปี",
    buttonText: "เลือกแพ็กเกจนี้!",
    isPopular: true,
    buttonVariant: "primary-filled",
    isSale: true,
    saleBadgeText: "ลดพิเศษ!",
    cardType: "standard", // กำหนดประเภทของการ์ด
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
    monthlyPrice: "699",
    yearlyPrice: "6,990",
    yearlyDiscountText: "ประหย0ยัดกว่า 1,398 บาท/ปี",
    buttonText: "ติดต่อทีมงาน",
    isPopular: false,
    buttonVariant: "primary-outline",
    isSale: false,
    badgeText: "พรีเมียม",
    badgeStyle: "premium",
    cardType: "premium", // กำหนดประเภทของการ์ดเป็น Premium
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
    triggerOnce: true,
    threshold: 0.1,
    delay: index * 100,
  });

  return (
    <div
      ref={ref}
      style={{
        ...styles.faqItem,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${index * 0.1}s`,
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
  const handleButtonClick = () => {
    window.open(LINE_OA_URL, "_blank");
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

      {/* <Navbar /> */}

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

              // กำหนดสีตัวอักษรเริ่มต้นและสำหรับ Premium Card
              const textColor =
                pkg.cardType === "premium" ? "#e0e0e0" : styles.packageTitle.color;
              const descriptionColor =
                pkg.cardType === "premium" ? "#b0bec5" : styles.packageDescription.color;
              const featureColor =
                pkg.cardType === "premium" ? "#e0e0e0" : styles.featureItem.color;
              const pricePrimaryColor =
                pkg.cardType === "premium" ? "#fff" : styles.monthlyPrice.color;
              const priceSecondaryColor =
                pkg.cardType === "premium" ? "#b0bec5" : styles.yearlyPrice.color;
              const discountTextColor =
                pkg.cardType === "premium" ? "#81c784" : styles.discountText.color;
              const originalPriceColor =
                pkg.cardType === "premium" ? "#999" : styles.originalPriceValue.color;

              // Calculate discount percentage if applicable
              let discountPercentage = null;
              if (pkg.isSale && pkg.originalMonthlyPrice && pkg.monthlyPrice) {
                const originalMonthly = parseFloat(pkg.originalMonthlyPrice);
                const currentMonthly = parseFloat(pkg.monthlyPrice);
                if (originalMonthly > currentMonthly) {
                  discountPercentage = (
                    ((originalMonthly - currentMonthly) / originalMonthly) *
                    100
                  ).toFixed(0); // No decimal places for percentage
                }
              }

              return (
                <div
                  key={index}
                  ref={ref}
                  style={{
                    ...styles.packageCard,
                    ...(pkg.isPopular ? styles.popularPackage : {}),
                    ...(pkg.cardType === "standard" ? styles.standardCard : {}),
                    ...(pkg.cardType === "premium" ? styles.premiumCard : {}),
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
                  {pkg.isSale && (
                    <div style={styles.saleBadge}>
                      <span>
                        {pkg.saleBadgeText}{" "}
                        {discountPercentage && `-${discountPercentage}%`}
                      </span>
                    </div>
                  )}
                  {pkg.badgeText &&
                    !pkg.isPopular &&
                    !pkg.isSale &&
                    pkg.badgeStyle !== "premium" && (
                      <div style={styles.packageBadge}>
                        <span>{pkg.badgeText}</span>
                      </div>
                    )}
                  {pkg.badgeText && pkg.badgeStyle === "premium" && (
                    <div style={styles.premiumBadge}>
                      <span>{pkg.badgeText}</span>
                    </div>
                  )}

                  <h3 style={{ ...styles.packageTitle, color: textColor }}>
                    {pkg.name}
                  </h3>
                  <p
                    style={{ ...styles.packageDescription, color: descriptionColor }}
                  >
                    {pkg.description}
                  </p>
                  <div style={styles.priceContainer}>
                    <div style={{ ...styles.monthlyPrice, color: pricePrimaryColor }}>
                      <span style={{ ...styles.priceCurrency, color: pricePrimaryColor }}>
                        ฿
                      </span>
                      {pkg.originalMonthlyPrice && (
                        <span
                          style={{
                            ...styles.originalPriceValue,
                            color: originalPriceColor,
                          }}
                        >
                          {pkg.originalMonthlyPrice}
                        </span>
                      )}
                      <span
                        style={
                          pkg.isSale
                            ? styles.salePriceValue
                            : { ...styles.priceValue, color: pricePrimaryColor }
                        }
                      >
                        {pkg.monthlyPrice}
                      </span>
                      <span style={{ ...styles.priceUnit, color: priceSecondaryColor }}>
                        /เดือน
                      </span>
                    </div>
                    <div style={{ ...styles.yearlyPrice, color: priceSecondaryColor }}>
                      หรือ{" "}
                      {pkg.originalYearlyPrice && (
                        <span
                          style={{
                            ...styles.originalYearlyPriceValue,
                            color: originalPriceColor,
                          }}
                        >
                          ฿{pkg.originalYearlyPrice}
                        </span>
                      )}
                      <span
                        style={
                          pkg.isSale
                            ? styles.saleYearlyPriceValue
                            : { ...styles.yearlyPriceValue, color: pricePrimaryColor }
                        }
                      >
                        ฿{pkg.yearlyPrice}
                      </span>
                      /ปี
                      <p style={{ ...styles.discountText, color: discountTextColor }}>
                        {pkg.yearlyDiscountText}
                      </p>
                    </div>
                  </div>
                  <ul style={styles.featureList}>
                    {pkg.features.map((feature, i) => (
                      <li
                        key={i}
                        style={{
                          ...styles.featureItem,
                          color: featureColor, // สีข้อความฟีเจอร์
                          // ปรับ borderBottom สำหรับ Premium Card
                          borderBottom:
                            pkg.cardType === "premium"
                              ? "1px solid rgba(255,255,255,0.1)"
                              : styles.featureItem.borderBottom,
                        }}
                      >
                        <span
                          style={{
                            color: pkg.cardType === "premium" ? "#FFD700" : "#2e7d32", // สีทองสำหรับ Premium, สีเขียวสำหรับ Standard
                            marginRight: "10px", // เพิ่มระยะห่างเล็กน้อย
                          }}
                        >
                          ✔️
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    style={
                      pkg.buttonVariant === "primary-filled"
                        ? styles.selectButtonFilled
                        : styles.selectButtonOutline
                    }
                    onClick={handleButtonClick}
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

// Inline Styles
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
    borderRadius: "12px",
    padding: "35px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
    cursor: "pointer",
    position: "relative",
  },
  standardCard: {
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.08)",
  },
  premiumCard: {
    // ปรับปรุงให้ดูเงาๆ เงินๆ
    backgroundColor: "#36454F", // Charcoal Gray - สีเทาเข้มออกดำ
    backgroundImage: "linear-gradient(to bottom, #424242, #212121)", // Gradient เพิ่มมิติ
    color: "#e0e0e0", // สีตัวอักษรหลักใน Premium Card
    border: "2px solid #BDB76B", // Dark Goldenrod - ขอบสีทองเข้มขึ้น
    boxShadow:
      "0 15px 40px rgba(0, 0, 0, 0.6), inset 0 2px 5px rgba(255, 255, 255, 0.1)", // เงาที่ลึกและมีมิติมากขึ้น พร้อมเงาด้านใน
    textShadow: "1px 1px 2px rgba(0,0,0,0.3)", // เงาข้อความเล็กน้อย
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
    backgroundColor: "#64b5f5",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "0 12px 0 12px",
    fontWeight: "700",
    fontSize: "0.9rem",
    letterSpacing: "0.05em",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    zIndex: 3,
  },
  saleBadge: {
    position: "absolute",
    top: "0",
    left: "0",
    backgroundColor: "#e53935",
    color: "#fff",
    padding: "10px 15px",
    borderRadius: "12px 0 12px 0",
    fontWeight: "700",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    transform: "rotate(-5deg) translateX(-15px) translateY(15px)",
    transformOrigin: "top left",
    zIndex: 3,
  },
  packageBadge: {
    position: "absolute",
    top: "0px",
    left: "0px",
    backgroundColor: "#4CAF50",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "0 12px 0 12px",
    fontWeight: "600",
    fontSize: "0.85rem",
    letterSpacing: "0.05em",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    zIndex: 3,
    transform: "rotate(-5deg) translateX(-5px) translateY(10px)",
    transformOrigin: "top left",
  },
  premiumBadge: {
    position: "absolute",
    top: "0px",
    left: "0px",
    backgroundColor: "#FFC107",
    color: "#212121",
    padding: "10px 15px",
    borderRadius: "0 12px 0 12px",
    fontWeight: "700",
    fontSize: "0.9rem",
    letterSpacing: "0.05em",
    boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
    zIndex: 3,
    transform: "rotate(-5deg) translateX(-10px) translateY(10px)",
    transformOrigin: "top left",
    backgroundImage: "linear-gradient(to bottom right, #FFECB3, #FFC107)",
    border: "1px solid #BCAAA4",
  },
  packageTitle: {
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "8px",
    marginTop: "20px",
    color: "#1c315e", // Default color
  },
  packageDescription: {
    color: "#546e7a", // Default color
    marginBottom: "20px",
    minHeight: "50px",
    fontSize: "0.95rem",
    lineHeight: "1.5",
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
    marginBottom: "5px",
    color: "#1c315e", // Default color
  },
  priceCurrency: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginRight: "5px",
  },
  priceValue: {
    fontSize: "3rem",
    fontWeight: "800",
    lineHeight: "1",
    color: "#1c315e", // Default color
  },
  salePriceValue: {
    fontSize: "3.2rem",
    fontWeight: "800",
    lineHeight: "1",
    color: "#e53935",
    textShadow: "0 2px 5px rgba(229, 57, 53, 0.3)",
  },
  originalPriceValue: {
    fontSize: "2.2rem",
    fontWeight: "600",
    textDecoration: "line-through",
    color: "#999", // Default color
    marginRight: "10px",
    opacity: 0.7,
  },
  priceUnit: {
    fontSize: "1rem",
    marginLeft: "5px",
    color: "#546e7a", // Default color
  },
  yearlyPrice: {
    fontSize: "0.95rem",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    color: "#546e7a", // Default color
  },
  yearlyPriceValue: {
    fontWeight: "700",
    color: "#1c315e", // Default color
  },
  saleYearlyPriceValue: {
    fontWeight: "700",
    color: "#e53935",
    fontSize: "1.05rem",
  },
  originalYearlyPriceValue: {
    fontWeight: "500",
    textDecoration: "line-through",
    color: "#999", // Default color
    opacity: 0.7,
  },
  discountText: {
    fontSize: "0.85rem",
    fontWeight: "600",
    marginTop: "5px",
    color: "#2e7d32", // Default color
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    marginBottom: "25px",
    width: "100%",
  },
  featureItem: {
    padding: "9px 20px",
    borderBottom: "1px solid #eceff1", // Default border
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    color: "#37474f", // Default color
  },
  "featureItem:last-child": {
    borderBottom: "none",
  },
  selectButtonFilled: {
    background: "#64b5f6",
    color: "#fff",
    border: "none",
    padding: "13px 32px",
    borderRadius: "30px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    letterSpacing: "0.03em",
    boxShadow: "0 4px 10px rgba(100, 181, 246, 0.4)",
    transition: "all 0.3s ease",
    marginTop: "auto",
    minWidth: "170px",
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
    padding: "11px 30px",
    borderRadius: "30px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    letterSpacing: "0.03em",
    transition: "all 0.3s ease",
    marginTop: "auto",
    minWidth: "170px",
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
      fontSize: "2.5rem",
    },
    salePriceValue: {
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
      fontSize: "2.2rem",
    },
    salePriceValue: {
      fontSize: "2.5rem",
    },
    saleBadge: {
      padding: "8px 12px",
      fontSize: "0.85rem",
    },
    packageBadge: {
      padding: "7px 10px",
      fontSize: "0.8rem",
    },
    premiumBadge: {
      padding: "8px 12px",
      fontSize: "0.85rem",
    },
  },
};

export default Packages;
