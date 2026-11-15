import { TeachingLevel } from "@prisma/client";

/**
 * Sample school directory for local development. Not exhaustive: the form lets
 * teachers type their school when it is missing. Import the full MOET list here later.
 */
export const SAMPLE_SCHOOLS: {
  province: string;
  level: TeachingLevel;
  names: string[];
}[] = [
  {
    province: "Hà Nội",
    level: TeachingLevel.UNIVERSITY,
    names: [
      "Đại học Bách khoa Hà Nội",
      "Trường Đại học Công nghệ - ĐHQG Hà Nội",
      "Học viện Công nghệ Bưu chính Viễn thông",
      "Trường Đại học Sư phạm Hà Nội",
    ],
  },
  {
    province: "Hà Nội",
    level: TeachingLevel.HIGH_SCHOOL,
    names: ["Trường THPT chuyên Hà Nội - Amsterdam", "Trường THPT Chu Văn An"],
  },
  {
    province: "Đà Nẵng",
    level: TeachingLevel.UNIVERSITY,
    names: [
      "Trường Đại học Bách khoa - Đại học Đà Nẵng",
      "Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn - Đại học Đà Nẵng",
      "Trường Đại học Sư phạm - Đại học Đà Nẵng",
      "Trường Đại học Kinh tế - Đại học Đà Nẵng",
      "Trường Đại học Duy Tân",
    ],
  },
  {
    province: "Đà Nẵng",
    level: TeachingLevel.HIGH_SCHOOL,
    names: ["Trường THPT chuyên Lê Quý Đôn", "Trường THPT Phan Châu Trinh"],
  },
  {
    province: "TP. Hồ Chí Minh",
    level: TeachingLevel.UNIVERSITY,
    names: [
      "Trường Đại học Bách khoa - ĐHQG TP.HCM",
      "Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM",
      "Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
      "Trường Đại học Sư phạm TP.HCM",
    ],
  },
  {
    province: "TP. Hồ Chí Minh",
    level: TeachingLevel.COLLEGE,
    names: ["Trường Cao đẳng Kỹ thuật Cao Thắng"],
  },
  {
    province: "TP. Hồ Chí Minh",
    level: TeachingLevel.HIGH_SCHOOL,
    names: [
      "Trường THPT chuyên Lê Hồng Phong",
      "Trường Phổ thông Năng khiếu - ĐHQG TP.HCM",
    ],
  },
  {
    province: "Huế",
    level: TeachingLevel.UNIVERSITY,
    names: [
      "Trường Đại học Khoa học - Đại học Huế",
      "Trường Đại học Sư phạm - Đại học Huế",
    ],
  },
  {
    province: "Huế",
    level: TeachingLevel.HIGH_SCHOOL,
    names: ["Trường THPT chuyên Quốc Học Huế"],
  },
  {
    province: "Cần Thơ",
    level: TeachingLevel.UNIVERSITY,
    names: ["Trường Đại học Cần Thơ"],
  },
  {
    province: "Cần Thơ",
    level: TeachingLevel.HIGH_SCHOOL,
    names: ["Trường THPT chuyên Lý Tự Trọng"],
  },
  {
    province: "Hải Phòng",
    level: TeachingLevel.UNIVERSITY,
    names: ["Trường Đại học Hàng hải Việt Nam"],
  },
  {
    province: "Hải Phòng",
    level: TeachingLevel.HIGH_SCHOOL,
    names: ["Trường THPT chuyên Trần Phú"],
  },
  {
    province: "Nghệ An",
    level: TeachingLevel.UNIVERSITY,
    names: ["Trường Đại học Vinh"],
  },
  {
    province: "Nghệ An",
    level: TeachingLevel.HIGH_SCHOOL,
    names: ["Trường THPT chuyên Phan Bội Châu"],
  },
];
