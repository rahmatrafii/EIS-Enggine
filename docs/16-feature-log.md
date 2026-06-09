# Feature Log — EIS Engine Backend

Log ini WAJIB diperbarui status centangnya setiap kali satu fitur/endpoint per fase telah selesai dikerjakan, diuji, dan kode testing-nya passing (hijau).

## Status Legend
✅ Selesai | 🚧 Sedang dikerjakan | ❌ Belum dimulai

---

## FASE 0 — Initialization
| Status | Output | Keterangan |
| :---: | :--- | :--- |
| ✅ | Project initialized | package.json, .env, src/app.js, server.js |
| ✅ | Prisma connected | src/config/prisma.js, schema pushed ke DB |
| ✅ | Jest configured | jest.config.js, tests/setup.js |
| ✅ | Cloudinary configured | src/config/cloudinary.js terhubung |

## FASE 1 — Utilities & Error Handling
| Status | File | Fungsi yang tersedia |
| :---: | :--- | :--- |
| ✅ | `src/utils/response.js` | sendSuccess, sendError, AppError |
| ✅ | `src/utils/ageCategory.js` | determineAgeCategory |
| ✅ | `src/utils/otpGenerator.js` | generateOtp |
| ✅ | `src/utils/tokenUrl.js` | generateRetentionToken, verifyRetentionToken |
| ✅ | `src/utils/eisCalculator.js` | calculateKnowledgeGain, calculateEngagementScore, calculateRetentionScore, calculateFinalEis, assignGrade |
| ✅ | `src/utils/emailSender.js` | sendEmail (Nodemailer + Gmail) |
| ✅ | `src/middleware/error.middleware.js` | Central error handler |
| ✅ | `src/middleware/validate.middleware.js` | validate(schema) |

## FASE 2 — Auth Middleware
| Status | File | Fungsi |
| :---: | :--- | :--- |
| ✅ | `src/middleware/auth.middleware.js` | authenticate |
| ✅ | `src/middleware/adminAuth.middleware.js` | requireAdmin |
| ✅ | `src/middleware/cronAuth.middleware.js` | requireCronSecret |

## FASE 3 — Users
| Status | Method | Endpoint | Test |
| :---: | :--- | :--- | :---: |
| ✅ | POST | `/api/v1/users/register` | ✅ |
| ✅ | POST | `/api/v1/users/request-otp` | ✅ |
| ✅ | POST | `/api/v1/users/verify-otp` | ✅ |
| ✅ | GET  | `/api/v1/users/profile` | ✅ |

## FASE 4 — Sessions
| Status | Method | Endpoint | Test |
| :---: | :--- | :--- | :---: |
| ✅ | POST | `/api/v1/sessions/start` | ✅ |
| ✅ | POST | `/api/v1/sessions/end` | ✅ |
| ✅ | GET  | `/api/v1/sessions/history` | ✅ |

## FASE 5 — Quizzes
| Status | Method | Endpoint | Test |
| :---: | :--- | :--- | :---: |
| ✅ | GET  | `/api/v1/quizzes/fetch` | ✅ |
| ✅ | POST | `/api/v1/quizzes/submit` | ✅ |
| ✅ | GET  | `/api/v1/quizzes/result/:session_id` | ✅ |
| ✅ | GET  | `/api/v1/quizzes/retention-status` | ✅ |

## FASE 6 — Tracking
| Status | Method | Endpoint | Test |
| :---: | :--- | :--- | :---: |
| ✅ | POST  | `/api/v1/track/checkin` | ✅ |
| ✅ | PATCH | `/api/v1/track/interact` | ✅ |
| ✅ | POST  | `/api/v1/track/lab-log` | ✅ |
| ✅ | POST  | `/api/v1/track/checkout` | ✅ |

## FASE 7 — Retention
| Status | Method | Endpoint | Test |
| :---: | :--- | :--- | :---: |
| ✅ | POST | `/api/v1/retention/trigger` | ✅ |
| ✅ | GET  | `/api/v1/retention/quiz/:token` | ✅ |
| ✅ | POST | `/api/v1/retention/submit/:token` | ✅ |
| ✅ | -    | Scheduler (`node-cron`) | ✅ |

## FASE 8 — Analytics
| Status | Method | Endpoint | Test |
| :---: | :--- | :--- | :---: |
| ✅ | GET | `/api/v1/analytics/eis/:user_id` | ✅ |
| ✅ | GET | `/api/v1/analytics/session/:session_id` | ✅ |
| ✅ | GET | `/api/v1/analytics/dashboard` | ✅ |


## FASE 9 — Admin
| Status | Method | Endpoint | Test |
| :---: | :--- | :--- | :---: |
| ✅ | POST   | `/api/v1/admin/exhibits` | ✅ |
| ✅ | GET    | `/api/v1/admin/exhibits` | ✅ |
| ✅ | GET    | `/api/v1/admin/exhibits/:exhibit_id` | ✅ |
| ✅ | DELETE | `/api/v1/admin/exhibits/:exhibit_id` | ✅ |
| ✅ | POST   | `/api/v1/admin/content` | ✅ |
| ✅ | POST   | `/api/v1/admin/media` | ✅ |
| ✅ | POST   | `/api/v1/admin/quizzes` | ✅ |

## FASE 10 — Final
| Status | Item | Keterangan |
| :---: | :--- | :--- |
| ✅ | Full test suite passing | Seluruh command test lolos (`npm test`) |
| ✅ | Coverage >= 80% | `npm run test:coverage` minimal 80% per lines (Saat ini 87.12%) |
| ✅ | Log Update Selesai | Semua endpoint dan task di tabel Feature Log tertandai ✅ |
