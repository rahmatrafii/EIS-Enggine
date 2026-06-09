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
  description: z.string().optional().nullable(),
  imageUrl: z
    .string()
    .url('imageUrl harus berupa URL valid')
    .optional()
    .nullable(),
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

export const getExhibitDetailSchema = z.object({
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
  ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT', 'ALL'], {
    required_error: 'ageCategory wajib diisi',
    invalid_type_error: 'ageCategory harus berupa CHILD, TEEN, ADULT, atau ALL',
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

export const getQuizDetailSchema = z.object({
  quiz_id: z.coerce.number().int().positive(),
});

export const updateExhibitSchema = z.object({
  name: z
    .string({ required_error: 'Nama kandang wajib diisi' })
    .min(1, 'Nama kandang wajib diisi')
    .max(100, 'Nama kandang maksimal 100 karakter'),
  zoneName: z
    .string({ required_error: 'Nama zona wajib diisi' })
    .min(1, 'Nama zona wajib diisi')
    .max(50, 'Nama zona maksimal 50 karakter'),
  description: z.string().optional().nullable(),
  imageUrl: z
    .string()
    .url('imageUrl harus berupa URL valid')
    .optional()
    .nullable(),
});

export const deleteContentSchema = z.object({
  id: z.coerce.number().int().positive('ID konten harus berupa angka bulat positif'),
});

export const deleteMediaSchema = z.object({
  id: z.coerce.number().int().positive('ID media harus berupa angka bulat positif'),
});

export const updateQuizSchema = createQuizSchema;

export const deleteQuizSchema = z.object({
  quiz_id: z.coerce.number().int().positive('quiz_id harus berupa angka bulat positif'),
});

const targetSchema = z.object({
  imageUrl: z.string({ required_error: 'target.imageUrl wajib diisi' }).url('target.imageUrl harus berupa URL valid'),
  label: z.string({ required_error: 'target.label wajib diisi' }).min(1, 'target.label tidak boleh kosong'),
});

const dragDropItemSchema = z.object({
  id: z.union([z.string(), z.number()], { required_error: 'item.id wajib diisi' }),
  imageUrl: z.string({ required_error: 'item.imageUrl wajib diisi' }).url('item.imageUrl harus berupa URL valid'),
  label: z.string({ required_error: 'item.label wajib diisi' }).min(1, 'item.label tidak boleh kosong'),
  isCorrect: z.boolean({ required_error: 'item.isCorrect wajib diisi' }),
});

const matchingPairSchema = z.object({
  id: z.union([z.string(), z.number()], { required_error: 'pair.id wajib diisi' }),
  threat: z.string({ required_error: 'pair.threat wajib diisi' }).min(1, 'pair.threat tidak boleh kosong'),
  solution: z.string({ required_error: 'pair.solution wajib diisi' }).min(1, 'pair.solution tidak boleh kosong'),
});

const pictureChoiceOptionSchema = z.object({
  id: z.union([z.string(), z.number()], { required_error: 'option.id wajib diisi' }),
  imageUrl: z.string({ required_error: 'option.imageUrl wajib diisi' }).url('option.imageUrl harus berupa URL valid'),
  label: z.string({ required_error: 'option.label wajib diisi' }).min(1, 'option.label tidak boleh kosong'),
  isCorrect: z.boolean({ required_error: 'option.isCorrect wajib diisi' }),
});

export const createLabGameSchema = z
  .object({
    exhibitId: z
      .number({ required_error: 'exhibitId wajib diisi' })
      .int('exhibitId harus berupa integer')
      .positive('exhibitId harus berupa angka positif'),
    ageCategory: z.enum(['CHILD', 'TEEN', 'ADULT', 'ALL'], {
      required_error: 'ageCategory wajib diisi',
      invalid_type_error: 'ageCategory harus berupa CHILD, TEEN, ADULT, atau ALL',
    }),
    gameType: z.enum(['DRAG_DROP', 'MATCHING', 'PICTURE_CHOICE'], {
      required_error: 'gameType wajib diisi',
      invalid_type_error: 'gameType harus berupa DRAG_DROP, MATCHING, atau PICTURE_CHOICE',
    }),
    title: z
      .string({ required_error: 'title wajib diisi' })
      .min(1, 'title wajib diisi')
      .max(150, 'title maksimal 150 karakter'),
    gameConfig: z.any({ required_error: 'gameConfig wajib diisi' }),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const { gameType, gameConfig } = data;

    if (!gameConfig || typeof gameConfig !== 'object') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'gameConfig harus berupa objek valid',
        path: ['gameConfig'],
      });
      return;
    }

    if (gameType === 'DRAG_DROP') {
      // Validate target
      if (!gameConfig.target || typeof gameConfig.target !== 'object') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'target wajib berupa objek valid',
          path: ['gameConfig', 'target'],
        });
      } else {
        const targetResult = targetSchema.safeParse(gameConfig.target);
        if (!targetResult.success) {
          targetResult.error.issues.forEach((issue) => {
            ctx.addIssue({
              ...issue,
              path: ['gameConfig', 'target', ...issue.path],
            });
          });
        }
      }

      // Validate items
      if (!Array.isArray(gameConfig.items)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'items harus berupa array',
          path: ['gameConfig', 'items'],
        });
      } else {
        const itemsResult = z
          .array(dragDropItemSchema)
          .min(1, 'items minimal berisi 1 item')
          .safeParse(gameConfig.items);
        if (!itemsResult.success) {
          itemsResult.error.issues.forEach((issue) => {
            ctx.addIssue({
              ...issue,
              path: ['gameConfig', 'items', ...issue.path],
            });
          });
        } else {
          const hasCorrect = gameConfig.items.some((item) => item.isCorrect === true);
          if (!hasCorrect) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Minimal satu item harus bertanda isCorrect: true',
              path: ['gameConfig', 'items'],
            });
          }
        }
      }
    } else if (gameType === 'MATCHING') {
      // Validate pairs
      if (!Array.isArray(gameConfig.pairs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'pairs harus berupa array',
          path: ['gameConfig', 'pairs'],
        });
      } else {
        const pairsResult = z
          .array(matchingPairSchema)
          .min(1, 'pairs minimal berisi 1 item')
          .safeParse(gameConfig.pairs);
        if (!pairsResult.success) {
          pairsResult.error.issues.forEach((issue) => {
            ctx.addIssue({
              ...issue,
              path: ['gameConfig', 'pairs', ...issue.path],
            });
          });
        }
      }
    } else if (gameType === 'PICTURE_CHOICE') {
      // Validate question
      if (typeof gameConfig.question !== 'string' || gameConfig.question.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'question wajib berupa string dan tidak boleh kosong',
          path: ['gameConfig', 'question'],
        });
      }

      // Validate options
      if (!Array.isArray(gameConfig.options)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'options harus berupa array',
          path: ['gameConfig', 'options'],
        });
      } else {
        const optionsResult = z
          .array(pictureChoiceOptionSchema)
          .min(1, 'options minimal berisi 1 item')
          .safeParse(gameConfig.options);
        if (!optionsResult.success) {
          optionsResult.error.issues.forEach((issue) => {
            ctx.addIssue({
              ...issue,
              path: ['gameConfig', 'options', ...issue.path],
            });
          });
        } else {
          const hasCorrect = gameConfig.options.some((opt) => opt.isCorrect === true);
          if (!hasCorrect) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Minimal satu opsi harus bertanda isCorrect: true',
              path: ['gameConfig', 'options'],
            });
          }
        }
      }
    }
  });

export const updateLabGameSchema = createLabGameSchema;

export const getLabGameParamsSchema = z.object({
  game_id: z.coerce.number().int().positive('game_id harus berupa angka bulat positif'),
});

export const getLabGamesQuerySchema = z.object({
  exhibit_id: z.coerce.number().int().positive('exhibit_id harus berupa angka bulat positif'),
});





