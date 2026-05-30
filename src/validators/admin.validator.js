import { z } from 'zod';

export const createExhibitSchema = z.object({
  name: z
    .string({ required_error: 'Nama kandang wajib diisi' })
    .min(1, 'Nama kandang wajib diisi')
    .max(100, 'Nama kandang maksimal 100 karakter'),
  zoneName: z
    .string({ required_error: 'Nama zona wajib diisi' })
    .min(1, 'Nama zona wajib diisi')
    .max(50, 'Nama zona maksimal 50 karakter'),
  description: z.string().optional(),
});

export const getExhibitsQuerySchema = z.object({
  is_active: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
      }
      return val;
    }, z.boolean({ invalid_type_error: 'is_active harus berupa boolean' }))
    .optional(),
  zone_name: z.string().optional(),
});

export const deleteExhibitSchema = z.object({
  exhibit_id: z.coerce.number().int().positive(),
});

export const createContentSchema = z.object({
  exhibitId: z
    .number({ required_error: 'exhibitId wajib diisi' })
    .int('exhibitId harus berupa integer')
    .positive('exhibitId harus berupa angka positif'),
  ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT'], {
    required_error: 'ageCategory wajib diisi',
    invalid_type_error: 'ageCategory harus berupa CHILD, TEEN, atau ADULT',
  }),
  contentTitle: z
    .string({ required_error: 'contentTitle wajib diisi' })
    .min(1, 'contentTitle wajib diisi')
    .max(150, 'contentTitle maksimal 150 karakter'),
  contentBody: z
    .string({ required_error: 'contentBody wajib diisi' })
    .min(1, 'contentBody wajib diisi'),
});

export const createMediaSchema = z.object({
  exhibitId: z
    .number({ required_error: 'exhibitId wajib diisi' })
    .int('exhibitId harus berupa integer')
    .positive('exhibitId harus berupa angka positif'),
  ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT'], {
    required_error: 'ageCategory wajib diisi',
    invalid_type_error: 'ageCategory harus berupa CHILD, TEEN, atau ADULT',
  }),
  mediaType: z.enum(['AUDIO', 'VIDEO', 'IMAGE_INFOGRAPHIC', 'INTERACTIVE_LAB'], {
    required_error: 'mediaType wajib diisi',
    invalid_type_error: 'mediaType harus berupa AUDIO, VIDEO, IMAGE_INFOGRAPHIC, atau INTERACTIVE_LAB',
  }),
  title: z
    .string({ required_error: 'title wajib diisi' })
    .min(1, 'title wajib diisi')
    .max(150, 'title maksimal 150 karakter'),
  fileUrl: z
    .string({ required_error: 'fileUrl wajib diisi' })
    .min(1, 'fileUrl wajib diisi')
    .url('fileUrl harus berupa URL valid'),
});

export const createQuizSchema = z
  .object({
    exhibitId: z
      .number({ invalid_type_error: 'exhibitId harus berupa angka' })
      .int('exhibitId harus berupa integer')
      .positive('exhibitId harus berupa angka positif')
      .nullable()
      .optional(),
    scope: z.enum(['GLOBAL', 'EXHIBIT'], {
      required_error: 'scope wajib diisi',
      invalid_type_error: 'scope harus berupa GLOBAL atau EXHIBIT',
    }),
    title: z
      .string({ required_error: 'title wajib diisi' })
      .min(1, 'title wajib diisi')
      .max(150, 'title maksimal 150 karakter'),
    quizType: z.enum(['PRE_ZOO', 'POST_ZOO', 'RETENTION_1W', 'RETENTION_1M'], {
      required_error: 'quizType wajib diisi',
      invalid_type_error: 'quizType harus berupa PRE_ZOO, POST_ZOO, RETENTION_1W, atau RETENTION_1M',
    }),
    ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT'], {
      required_error: 'ageCategory wajib diisi',
      invalid_type_error: 'ageCategory harus berupa CHILD, TEEN, atau ADULT',
    }),
    questions: z
      .array(
        z.object({
          questionText: z
            .string({ required_error: 'questionText wajib diisi' })
            .min(1, 'questionText wajib diisi'),
          optionA: z.string({ required_error: 'optionA wajib diisi' }).min(1, 'optionA wajib diisi'),
          optionB: z.string({ required_error: 'optionB wajib diisi' }).min(1, 'optionB wajib diisi'),
          optionC: z.string({ required_error: 'optionC wajib diisi' }).min(1, 'optionC wajib diisi'),
          optionD: z.string({ required_error: 'optionD wajib diisi' }).min(1, 'optionD wajib diisi'),
          correctOption: z.enum(['A', 'B', 'C', 'D'], {
            required_error: 'correctOption wajib diisi',
            invalid_type_error: 'correctOption harus berupa A, B, C, atau D',
          }),
          points: z
            .number({ invalid_type_error: 'points harus berupa angka' })
            .int('points harus berupa integer')
            .nonnegative('points tidak boleh negatif')
            .default(10)
            .optional(),
        })
      )
      .min(1, 'questions harus berisi minimal 1 item'),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'EXHIBIT' && (data.exhibitId === undefined || data.exhibitId === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'exhibitId wajib diisi jika scope adalah EXHIBIT',
        path: ['exhibitId'],
      });
    }
    if (data.scope === 'GLOBAL' && data.exhibitId !== undefined && data.exhibitId !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'exhibitId harus null jika scope adalah GLOBAL',
        path: ['exhibitId'],
      });
    }
  });




