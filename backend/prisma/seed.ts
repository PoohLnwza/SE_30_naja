import 'dotenv/config';
import {
  Prisma,
  PrismaClient,
  approval_status,
  appointment_status,
  invoice_status,
  item_type,
  payment_status,
  severity_level,
  slot_status,
  staff_role,
  staff_status,
  user_type,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
type ParentRecord = Awaited<ReturnType<typeof prisma.parent.create>>;
type QuestionRecord = Awaited<ReturnType<typeof prisma.question.create>>;
type ChoiceRecord = Awaited<ReturnType<typeof prisma.choice.create>>;

const decimal = (value: number) => new Prisma.Decimal(value.toFixed(2));
const dateAtUtc = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) => new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
const timeAtUtc = (hour: number, minute = 0) =>
  new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const todayUtc = startOfUtcDay(new Date());
const daysFromToday = (days: number, hour = 0, minute = 0) =>
  new Date(
    Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate() + days,
      hour,
      minute,
      0,
    ),
  );

type RoleName = 'admin' | 'parent' | 'doctor' | 'nurse' | 'psychologist';

async function clearDatabase() {
  await prisma.assessment_answer.deleteMany();
  await prisma.choice.deleteMany();
  await prisma.question.deleteMany();
  await prisma.child_assessment.deleteMany();
  await prisma.assessment_score_band.deleteMany();
  await prisma.dispense.deleteMany();
  await prisma.invoice_item.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.prescription_item.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.drug.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.diagnose.deleteMany();
  await prisma.treatment_plan.deleteMany();
  await prisma.vital_signs.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.appointments.deleteMany();
  await prisma.work_schedules.deleteMany();
  await prisma.room.deleteMany();
  await prisma.child_parent.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.child.deleteMany();
  await prisma.notifications.deleteMany();
  await prisma.user_roles.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.roles.deleteMany();
  await prisma.users.deleteMany();
}

async function main() {
  await clearDatabase();

  const passwordHash = await bcrypt.hash('111111', 10);

  const roleMap = Object.fromEntries(
    await Promise.all(
      (['admin', 'parent', 'doctor', 'nurse', 'psychologist'] as RoleName[]).map(
        async (roleName) => {
          const role = await prisma.roles.create({ data: { role_name: roleName } });
          return [roleName, role] as const;
        },
      ),
    ),
  ) as Record<RoleName, { role_id: number; role_name: string }>;

  const createUserWithRole = async (params: {
    username: string;
    userType: user_type;
    roleName: RoleName;
    lastLoginAt: Date;
  }) => {
    const user = await prisma.users.create({
      data: {
        username: params.username,
        password_hash: passwordHash,
        user_type: params.userType,
        is_active: true,
        last_login_at: params.lastLoginAt,
        updated_at: params.lastLoginAt,
      },
    });

    await prisma.user_roles.create({
      data: {
        user_id: user.user_id,
        role_id: roleMap[params.roleName].role_id,
      },
    });

    return user;
  };

  const adminUser = await createUserWithRole({
    username: 'admin',
    userType: user_type.staff,
    roleName: 'admin',
    lastLoginAt: dateAtUtc(2026, 3, 16, 8, 15),
  });

  const adminStaff = await prisma.staff.create({
    data: {
      first_name: 'System',
      last_name: 'Admin',
      role: staff_role.admin,
      status: staff_status.active,
      user_id: adminUser.user_id,
    },
  });

  const staffProfiles = [
    {
      username: 'dr.anan',
      firstName: 'Anan',
      lastName: 'Sirisuk',
      publicRole: 'doctor' as const,
      internalRole: staff_role.psychiatrist,
      status: staff_status.active,
      loginAt: dateAtUtc(2026, 3, 15, 16, 45),
    },
    {
      username: 'dr.pimchanok',
      firstName: 'Pimchanok',
      lastName: 'Wattanakul',
      publicRole: 'doctor' as const,
      internalRole: staff_role.psychiatrist,
      status: staff_status.active,
      loginAt: dateAtUtc(2026, 3, 16, 7, 55),
    },
    {
      username: 'nurse.suda',
      firstName: 'Suda',
      lastName: 'Khemthong',
      publicRole: 'nurse' as const,
      internalRole: staff_role.nurse,
      status: staff_status.active,
      loginAt: dateAtUtc(2026, 3, 16, 6, 50),
    },
    {
      username: 'nurse.kornkanok',
      firstName: 'Kornkanok',
      lastName: 'Boonchai',
      publicRole: 'nurse' as const,
      internalRole: staff_role.nurse,
      status: staff_status.inactive,
      loginAt: dateAtUtc(2026, 3, 10, 17, 20),
    },
    {
      username: 'psy.nicha',
      firstName: 'Nicha',
      lastName: 'Rungsiri',
      publicRole: 'psychologist' as const,
      internalRole: staff_role.psychologist,
      status: staff_status.active,
      loginAt: dateAtUtc(2026, 3, 16, 8, 5),
    },
    {
      username: 'psy.pakorn',
      firstName: 'Pakorn',
      lastName: 'Leelawat',
      publicRole: 'psychologist' as const,
      internalRole: staff_role.psychologist,
      status: staff_status.active,
      loginAt: dateAtUtc(2026, 3, 14, 19, 10),
    },
  ];

  const staffRecords = [adminStaff];
  for (const profile of staffProfiles) {
    const user = await createUserWithRole({
      username: profile.username,
      userType: user_type.staff,
      roleName: profile.publicRole,
      lastLoginAt: profile.loginAt,
    });

    const staff = await prisma.staff.create({
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        role: profile.internalRole,
        status: profile.status,
        user_id: user.user_id,
      },
    });

    staffRecords.push(staff);
  }

  const parentProfiles = [
    {
      username: '1103700000011',
      firstName: 'Somchai',
      lastName: 'Jaidee',
      nationalId: '1103700000011',
      phone: '0812345678',
      loginAt: dateAtUtc(2026, 3, 15, 20, 10),
    },
    {
      username: '1103700000029',
      firstName: 'Suda',
      lastName: 'Preecha',
      nationalId: '1103700000029',
      phone: '0823456789',
      loginAt: dateAtUtc(2026, 3, 16, 9, 5),
    },
    {
      username: '1103700000037',
      firstName: 'Araya',
      lastName: 'Thonglor',
      nationalId: '1103700000037',
      phone: '0834567890',
      loginAt: dateAtUtc(2026, 3, 14, 21, 40),
    },
    {
      username: '1103700000045',
      firstName: 'Kittipong',
      lastName: 'Rattanakorn',
      nationalId: '1103700000045',
      phone: '0845678901',
      loginAt: dateAtUtc(2026, 3, 12, 18, 25),
    },
    {
      username: '1103700000053',
      firstName: 'Mali',
      lastName: 'Phrommatat',
      nationalId: '1103700000053',
      phone: '0856789012',
      loginAt: dateAtUtc(2026, 3, 13, 12, 55),
    },
    {
      username: '1103700000061',
      firstName: 'Nattapong',
      lastName: 'Suwan',
      nationalId: '1103700000061',
      phone: '0867890123',
      loginAt: dateAtUtc(2026, 3, 11, 7, 40),
    },
  ];

  const parentRecords: ParentRecord[] = [];
  for (const profile of parentProfiles) {
    const user = await createUserWithRole({
      username: profile.username,
      userType: user_type.parent,
      roleName: 'parent',
      lastLoginAt: profile.loginAt,
    });

    const parent = await prisma.parent.create({
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        national_id: profile.nationalId,
        phone: profile.phone,
        user_id: user.user_id,
      },
    });

    parentRecords.push(parent);
  }

  const children = await Promise.all([
    prisma.child.create({
      data: {
        first_name: 'Kawin',
        last_name: 'Jaidee',
        national_id: '2103700000018',
        birth_date: dateAtUtc(2018, 5, 12),
      },
    }),
    prisma.child.create({
      data: {
        first_name: 'Lalin',
        last_name: 'Jaidee',
        national_id: '2103700000026',
        birth_date: dateAtUtc(2020, 11, 3),
      },
    }),
    prisma.child.create({
      data: {
        first_name: 'Thanwa',
        last_name: 'Preecha',
        national_id: '2103700000034',
        birth_date: dateAtUtc(2017, 8, 22),
      },
    }),
    prisma.child.create({
      data: {
        first_name: 'Maysa',
        last_name: 'Thonglor',
        national_id: '2103700000042',
        birth_date: dateAtUtc(2019, 2, 14),
      },
    }),
    prisma.child.create({
      data: {
        first_name: 'Punn',
        last_name: 'Rattanakorn',
        national_id: '2103700000059',
        birth_date: dateAtUtc(2016, 12, 9),
      },
    }),
    prisma.child.create({
      data: {
        first_name: 'Namon',
        last_name: 'Phrommatat',
        national_id: '2103700000067',
        birth_date: dateAtUtc(2021, 6, 1),
      },
    }),
    prisma.child.create({
      data: {
        first_name: 'Fahsai',
        last_name: 'Suwan',
        national_id: '2103700000075',
        birth_date: dateAtUtc(2018, 9, 30),
      },
    }),
    prisma.child.create({
      data: {
        first_name: 'Tonnam',
        last_name: 'Suwan',
        national_id: '2103700000083',
        birth_date: dateAtUtc(2022, 1, 18),
      },
    }),
  ]);

  const childParentLinks = [
    [children[0], parentRecords[0]],
    [children[1], parentRecords[0]],
    [children[2], parentRecords[1]],
    [children[3], parentRecords[2]],
    [children[4], parentRecords[3]],
    [children[5], parentRecords[4]],
    [children[6], parentRecords[5]],
    [children[7], parentRecords[5]],
  ] as const;

  for (const [child, parent] of childParentLinks) {
    await prisma.child_parent.create({
      data: {
        child_id: child.child_id,
        parent_id: parent.parent_id,
      },
    });
  }

  const rooms = await Promise.all([
    prisma.room.create({ data: { room_name: 'Room A101' } }),
    prisma.room.create({ data: { room_name: 'Room A102' } }),
    prisma.room.create({ data: { room_name: 'Counseling B201' } }),
    prisma.room.create({ data: { room_name: 'Assessment B202' } }),
    prisma.room.create({ data: { room_name: 'Observation C301' } }),
  ]);

  const schedules = await Promise.all([
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[1].staff_id,
        work_date: daysFromToday(1),
        start_time: timeAtUtc(9, 0),
        end_time: timeAtUtc(10, 0),
        slot_status: slot_status.booked,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[2].staff_id,
        work_date: daysFromToday(2),
        start_time: timeAtUtc(10, 30),
        end_time: timeAtUtc(11, 30),
        slot_status: slot_status.booked,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[5].staff_id,
        work_date: daysFromToday(3),
        start_time: timeAtUtc(13, 0),
        end_time: timeAtUtc(14, 0),
        slot_status: slot_status.booked,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[3].staff_id,
        work_date: daysFromToday(4),
        start_time: timeAtUtc(9, 0),
        end_time: timeAtUtc(9, 45),
        slot_status: slot_status.booked,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[1].staff_id,
        work_date: daysFromToday(5),
        start_time: timeAtUtc(14, 0),
        end_time: timeAtUtc(15, 0),
        slot_status: slot_status.booked,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[6].staff_id,
        work_date: daysFromToday(6),
        start_time: timeAtUtc(10, 0),
        end_time: timeAtUtc(11, 0),
        slot_status: slot_status.booked,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[2].staff_id,
        work_date: daysFromToday(1),
        start_time: timeAtUtc(9, 30),
        end_time: timeAtUtc(10, 30),
        slot_status: slot_status.available,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[5].staff_id,
        work_date: daysFromToday(2),
        start_time: timeAtUtc(15, 0),
        end_time: timeAtUtc(16, 0),
        slot_status: slot_status.available,
      },
    }),
    prisma.work_schedules.create({
      data: {
        staff_id: staffRecords[4].staff_id,
        work_date: daysFromToday(3),
        start_time: timeAtUtc(8, 30),
        end_time: timeAtUtc(12, 0),
        slot_status: slot_status.blocked,
      },
    }),
  ]);

  const appointments = await Promise.all([
    prisma.appointments.create({
      data: {
        patient_id: children[0].child_id,
        schedule_id: schedules[0].schedule_id,
        room_id: rooms[0].room_id,
        booked_by_user_id: parentRecords[0].user_id,
        status: appointment_status.completed,
        approval_status: approval_status.approved,
        created_at: daysFromToday(0, 10, 5),
      },
    }),
    prisma.appointments.create({
      data: {
        patient_id: children[2].child_id,
        schedule_id: schedules[1].schedule_id,
        room_id: rooms[1].room_id,
        booked_by_user_id: parentRecords[1].user_id,
        status: appointment_status.completed,
        approval_status: approval_status.approved,
        created_at: daysFromToday(0, 14, 20),
      },
    }),
    prisma.appointments.create({
      data: {
        patient_id: children[3].child_id,
        schedule_id: schedules[2].schedule_id,
        room_id: rooms[2].room_id,
        booked_by_user_id: parentRecords[2].user_id,
        status: appointment_status.completed,
        approval_status: approval_status.approved,
        created_at: daysFromToday(0, 9, 45),
      },
    }),
    prisma.appointments.create({
      data: {
        patient_id: children[4].child_id,
        schedule_id: schedules[3].schedule_id,
        room_id: rooms[0].room_id,
        booked_by_user_id: parentRecords[3].user_id,
        status: appointment_status.scheduled,
        approval_status: approval_status.pending,
        created_at: daysFromToday(0, 8, 30),
      },
    }),
    prisma.appointments.create({
      data: {
        patient_id: children[6].child_id,
        schedule_id: schedules[4].schedule_id,
        room_id: rooms[3].room_id,
        booked_by_user_id: parentRecords[5].user_id,
        status: appointment_status.scheduled,
        approval_status: approval_status.pending,
        created_at: daysFromToday(0, 7, 50),
      },
    }),
    prisma.appointments.create({
      data: {
        patient_id: children[5].child_id,
        schedule_id: schedules[5].schedule_id,
        room_id: rooms[2].room_id,
        booked_by_user_id: parentRecords[4].user_id,
        status: appointment_status.cancelled,
        approval_status: approval_status.rejected,
        created_at: daysFromToday(0, 16, 35),
      },
    }),
  ]);

  const visit1 = await prisma.visit.create({
    data: {
      appointment_id: appointments[0].appointment_id,
      visit_date: dateAtUtc(2026, 3, 12, 9, 20),
    },
  });
  const visit2 = await prisma.visit.create({
    data: {
      appointment_id: appointments[1].appointment_id,
      visit_date: dateAtUtc(2026, 3, 13, 10, 40),
    },
  });
  const visit3 = await prisma.visit.create({
    data: {
      appointment_id: appointments[2].appointment_id,
      visit_date: dateAtUtc(2026, 3, 14, 13, 10),
    },
  });

  await Promise.all([
    prisma.vital_signs.create({
      data: {
        visit_id: visit1.visit_id,
        weight_kg: decimal(24.4),
        height_cm: decimal(121.3),
        bp_systolic: 98,
        bp_diastolic: 63,
        heart_rate: 88,
        note: 'Sleeping later than usual and difficulty focusing in class.',
        created_at: dateAtUtc(2026, 3, 12, 9, 35),
      },
    }),
    prisma.vital_signs.create({
      data: {
        visit_id: visit2.visit_id,
        weight_kg: decimal(28.1),
        height_cm: decimal(129.7),
        bp_systolic: 101,
        bp_diastolic: 66,
        heart_rate: 84,
        note: 'No acute physical concerns. Appetite slightly reduced during exam week.',
        created_at: dateAtUtc(2026, 3, 13, 10, 55),
      },
    }),
    prisma.vital_signs.create({
      data: {
        visit_id: visit3.visit_id,
        weight_kg: decimal(22.8),
        height_cm: decimal(118.4),
        bp_systolic: 96,
        bp_diastolic: 61,
        heart_rate: 90,
        note: 'Becomes anxious before social activities and loud environments.',
        created_at: dateAtUtc(2026, 3, 14, 13, 25),
      },
    }),
  ]);

  const sdqAssessment = await prisma.assessment.create({
    data: {
      name: 'Strengths and Difficulties Questionnaire',
      created_by: staffRecords[5].staff_id,
    },
  });
  const anxietyAssessment = await prisma.assessment.create({
    data: {
      name: 'Child Anxiety Screening',
      created_by: staffRecords[6].staff_id,
    },
  });
  const attentionAssessment = await prisma.assessment.create({
    data: {
      name: 'Attention and Behavior Follow-up',
      created_by: staffRecords[5].staff_id,
    },
  });

  const assessmentBands = {
    sdq: await Promise.all([
      prisma.assessment_score_band.create({
        data: {
          assessment_id: sdqAssessment.assessment_id,
          min_score: 0,
          max_score: 5,
          severity_level: severity_level.normal,
          interpretation_text: 'Overall behavior is within the expected range.',
          recommendation_text: 'Continue routine monitoring at home and school.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: sdqAssessment.assessment_id,
          min_score: 6,
          max_score: 10,
          severity_level: severity_level.mild,
          interpretation_text: 'Some emotional or behavior concerns are present.',
          recommendation_text: 'Discuss triggers and review coping strategies in 1 month.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: sdqAssessment.assessment_id,
          min_score: 11,
          max_score: 15,
          severity_level: severity_level.moderate,
          interpretation_text: 'Symptoms are affecting daily function.',
          recommendation_text: 'Schedule structured follow-up and involve school support.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: sdqAssessment.assessment_id,
          min_score: 16,
          max_score: 20,
          severity_level: severity_level.severe,
          interpretation_text: 'High concern requiring close follow-up.',
          recommendation_text: 'Comprehensive review with psychiatrist and psychologist.',
        },
      }),
    ]),
    anxiety: await Promise.all([
      prisma.assessment_score_band.create({
        data: {
          assessment_id: anxietyAssessment.assessment_id,
          min_score: 0,
          max_score: 4,
          severity_level: severity_level.normal,
          interpretation_text: 'Low anxiety burden.',
          recommendation_text: 'No urgent intervention needed.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: anxietyAssessment.assessment_id,
          min_score: 5,
          max_score: 8,
          severity_level: severity_level.mild,
          interpretation_text: 'Mild anxiety symptoms reported.',
          recommendation_text: 'Monitor and reinforce coping routines.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: anxietyAssessment.assessment_id,
          min_score: 9,
          max_score: 12,
          severity_level: severity_level.moderate,
          interpretation_text: 'Anxiety is interfering with participation.',
          recommendation_text: 'Begin targeted counseling and parent coaching.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: anxietyAssessment.assessment_id,
          min_score: 13,
          max_score: 16,
          severity_level: severity_level.severe,
          interpretation_text: 'Anxiety symptoms are significant and persistent.',
          recommendation_text: 'Consider multidisciplinary intervention plan.',
        },
      }),
    ]),
    attention: await Promise.all([
      prisma.assessment_score_band.create({
        data: {
          assessment_id: attentionAssessment.assessment_id,
          min_score: 0,
          max_score: 3,
          severity_level: severity_level.normal,
          interpretation_text: 'Attention regulation is age-appropriate.',
          recommendation_text: 'Routine observation only.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: attentionAssessment.assessment_id,
          min_score: 4,
          max_score: 6,
          severity_level: severity_level.mild,
          interpretation_text: 'Occasional inattention is noted.',
          recommendation_text: 'Use structure and classroom reminders.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: attentionAssessment.assessment_id,
          min_score: 7,
          max_score: 9,
          severity_level: severity_level.moderate,
          interpretation_text: 'Inattention impacts task completion.',
          recommendation_text: 'Follow-up with school reports and behavior plan.',
        },
      }),
      prisma.assessment_score_band.create({
        data: {
          assessment_id: attentionAssessment.assessment_id,
          min_score: 10,
          max_score: 12,
          severity_level: severity_level.severe,
          interpretation_text: 'Attention difficulty is prominent across settings.',
          recommendation_text: 'Review treatment response and family support urgently.',
        },
      }),
    ]),
  };

  const assessmentQuestions = [
    {
      assessment: sdqAssessment,
      prompts: [
        'Often loses temper or becomes easily frustrated.',
        'Has trouble sitting still during school or homework.',
        'Gets along well with other children.',
      ],
    },
    {
      assessment: anxietyAssessment,
      prompts: [
        'Worries a lot before going to school or social events.',
        'Avoids new situations because of fear or embarrassment.',
        'Complains of stomachache or headache when anxious.',
      ],
    },
    {
      assessment: attentionAssessment,
      prompts: [
        'Needs repeated reminders to finish a simple task.',
        'Is easily distracted by sounds or activity nearby.',
        'Can stay focused on a preferred activity.',
      ],
    },
  ];

  const questionGroups: { question: QuestionRecord; choices: ChoiceRecord[] }[][] = [];
  for (const group of assessmentQuestions) {
    const questions: { question: QuestionRecord; choices: ChoiceRecord[] }[] = [];
    for (const prompt of group.prompts) {
      const question = await prisma.question.create({
        data: {
          assessment_id: group.assessment.assessment_id,
          question_text: prompt,
        },
      });

      const choices = await Promise.all([
        prisma.choice.create({
          data: { question_id: question.question_id, choice_text: 'Not true', score: 0 },
        }),
        prisma.choice.create({
          data: {
            question_id: question.question_id,
            choice_text: 'Somewhat true',
            score: 1,
          },
        }),
        prisma.choice.create({
          data: {
            question_id: question.question_id,
            choice_text: 'Certainly true',
            score: 2,
          },
        }),
      ]);

      questions.push({ question, choices });
    }

    questionGroups.push(questions);
  }

  const childAssessments = [
    {
      childId: children[0].child_id,
      assessmentId: attentionAssessment.assessment_id,
      totalScore: 8,
      bandId: assessmentBands.attention[2].band_id,
      interpretedText: 'Attention difficulties remain moderate at home and school.',
      assessedAt: dateAtUtc(2026, 3, 12, 11, 20),
      answers: [2, 2, 0],
      questionGroup: questionGroups[2],
    },
    {
      childId: children[2].child_id,
      assessmentId: sdqAssessment.assessment_id,
      totalScore: 7,
      bandId: assessmentBands.sdq[1].band_id,
      interpretedText: 'Mild behavioral concerns with good peer support overall.',
      assessedAt: dateAtUtc(2026, 3, 13, 12, 10),
      answers: [1, 1, 2],
      questionGroup: questionGroups[0],
    },
    {
      childId: children[3].child_id,
      assessmentId: anxietyAssessment.assessment_id,
      totalScore: 10,
      bandId: assessmentBands.anxiety[2].band_id,
      interpretedText: 'Moderate anxiety symptoms with school avoidance patterns.',
      assessedAt: dateAtUtc(2026, 3, 14, 14, 0),
      answers: [2, 2, 1],
      questionGroup: questionGroups[1],
    },
  ];

  for (const assessment of childAssessments) {
    const childAssessment = await prisma.child_assessment.create({
      data: {
        child_id: assessment.childId,
        assessment_id: assessment.assessmentId,
        total_score: assessment.totalScore,
        interpreted_band_id: assessment.bandId,
        interpreted_text: assessment.interpretedText,
        assessed_at: assessment.assessedAt,
      },
    });

    for (const [index, score] of assessment.answers.entries()) {
      const selectedChoice = assessment.questionGroup[index].choices[score];
      await prisma.assessment_answer.create({
        data: {
          child_assessment_id: childAssessment.child_assessment_id,
          question_id: assessment.questionGroup[index].question.question_id,
          choice_id: selectedChoice.choice_id,
          score: selectedChoice.score,
        },
      });
    }
  }

  await Promise.all([
    prisma.diagnose.create({
      data: {
        visit_id: visit1.visit_id,
        diagnosis_text:
          'Attention and impulsivity concerns consistent with ADHD symptoms; monitor school functioning.',
      },
    }),
    prisma.diagnose.create({
      data: {
        visit_id: visit2.visit_id,
        diagnosis_text:
          'Sleep dysregulation with mild mood fluctuation; continue behavioral sleep plan.',
      },
    }),
    prisma.diagnose.create({
      data: {
        visit_id: visit3.visit_id,
        diagnosis_text:
          'Social anxiety features with avoidance in peer settings; benefits from graded exposure.',
      },
    }),
  ]);

  await Promise.all([
    prisma.treatment_plan.create({
      data: {
        visit_id: visit1.visit_id,
        plan_detail:
          'Coordinate teacher feedback, start parent behavior log, review medication response in 4 weeks.',
      },
    }),
    prisma.treatment_plan.create({
      data: {
        visit_id: visit2.visit_id,
        plan_detail:
          'Maintain sleep diary, reduce late-night screen use, nurse phone follow-up next week.',
      },
    }),
    prisma.treatment_plan.create({
      data: {
        visit_id: visit3.visit_id,
        plan_detail:
          'Weekly CBT-based counseling for 6 sessions and home practice before social events.',
      },
    }),
  ]);

  const drugs = await Promise.all([
    prisma.drug.create({
      data: {
        name: 'Methylphenidate',
        dose: '10 mg tablet',
        unit_price: decimal(18.5),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Melatonin',
        dose: '3 mg tablet',
        unit_price: decimal(12.0),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Fluoxetine',
        dose: '10 mg capsule',
        unit_price: decimal(15.75),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Risperidone',
        dose: '0.5 mg tablet',
        unit_price: decimal(11.5),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Sertraline',
        dose: '25 mg tablet',
        unit_price: decimal(14.25),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Aripiprazole',
        dose: '5 mg tablet',
        unit_price: decimal(19.75),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Atomoxetine',
        dose: '18 mg capsule',
        unit_price: decimal(17.25),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Clonidine',
        dose: '100 mcg tablet',
        unit_price: decimal(9.5),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Escitalopram',
        dose: '5 mg tablet',
        unit_price: decimal(13.25),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Hydroxyzine',
        dose: '10 mg tablet',
        unit_price: decimal(8.75),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Quetiapine',
        dose: '25 mg tablet',
        unit_price: decimal(16.5),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Olanzapine',
        dose: '2.5 mg tablet',
        unit_price: decimal(18.0),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Lamotrigine',
        dose: '25 mg tablet',
        unit_price: decimal(12.75),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Valproate',
        dose: '200 mg tablet',
        unit_price: decimal(10.8),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Diazepam',
        dose: '2 mg tablet',
        unit_price: decimal(7.9),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Buspirone',
        dose: '5 mg tablet',
        unit_price: decimal(11.2),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Imipramine',
        dose: '10 mg tablet',
        unit_price: decimal(9.9),
      },
    }),
    prisma.drug.create({
      data: {
        name: 'Propranolol',
        dose: '10 mg tablet',
        unit_price: decimal(6.4),
      },
    }),
  ]);

  const prescription1 = await prisma.prescription.create({
    data: { visit_id: visit1.visit_id },
  });
  const prescription2 = await prisma.prescription.create({
    data: { visit_id: visit2.visit_id },
  });
  const prescription3 = await prisma.prescription.create({
    data: { visit_id: visit3.visit_id },
  });

  const prescriptionItems = await Promise.all([
    prisma.prescription_item.create({
      data: {
        prescription_id: prescription1.prescription_id,
        drug_id: drugs[0].drug_id,
        quantity: 30,
      },
    }),
    prisma.prescription_item.create({
      data: {
        prescription_id: prescription2.prescription_id,
        drug_id: drugs[1].drug_id,
        quantity: 30,
      },
    }),
    prisma.prescription_item.create({
      data: {
        prescription_id: prescription3.prescription_id,
        drug_id: drugs[2].drug_id,
        quantity: 14,
      },
    }),
  ]);

  await Promise.all([
    prisma.dispense.create({
      data: {
        prescription_id: prescription1.prescription_id,
        staff_id: staffRecords[3].staff_id,
      },
    }),
    prisma.dispense.create({
      data: {
        prescription_id: prescription2.prescription_id,
        staff_id: staffRecords[3].staff_id,
      },
    }),
    prisma.dispense.create({
      data: {
        prescription_id: prescription3.prescription_id,
        staff_id: staffRecords[3].staff_id,
      },
    }),
  ]);

  const invoice1 = await prisma.invoice.create({
    data: {
      visit_id: visit1.visit_id,
      total_amount: decimal(755),
      status: invoice_status.paid,
    },
  });
  const invoice2 = await prisma.invoice.create({
    data: {
      visit_id: visit2.visit_id,
      total_amount: decimal(510),
      status: invoice_status.paid,
    },
  });
  const invoice3 = await prisma.invoice.create({
    data: {
      visit_id: visit3.visit_id,
      total_amount: decimal(730.5),
      status: invoice_status.partially_paid,
    },
  });

  await Promise.all([
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice1.invoice_id,
        item_type: item_type.service,
        description: 'Psychiatric follow-up consultation',
        qty: 1,
        unit_price: decimal(200),
        created_at: dateAtUtc(2026, 3, 12, 10, 0),
      },
    }),
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice1.invoice_id,
        item_type: item_type.assessment,
        description: 'Attention behavior assessment review',
        qty: 1,
        unit_price: decimal(150),
        created_at: dateAtUtc(2026, 3, 12, 10, 5),
      },
    }),
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice1.invoice_id,
        item_type: item_type.drug,
        description: 'Methylphenidate 10 mg tablet',
        qty: 30,
        unit_price: decimal(13.5),
        prescription_item_id: prescriptionItems[0].prescription_item_id,
        created_at: dateAtUtc(2026, 3, 12, 10, 10),
      },
    }),
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice2.invoice_id,
        item_type: item_type.service,
        description: 'Pediatric mental health consultation',
        qty: 1,
        unit_price: decimal(150),
        created_at: dateAtUtc(2026, 3, 13, 11, 0),
      },
    }),
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice2.invoice_id,
        item_type: item_type.drug,
        description: 'Melatonin 3 mg tablet',
        qty: 30,
        unit_price: decimal(12),
        prescription_item_id: prescriptionItems[1].prescription_item_id,
        created_at: dateAtUtc(2026, 3, 13, 11, 5),
      },
    }),
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice3.invoice_id,
        item_type: item_type.service,
        description: 'Psychology counseling intake',
        qty: 1,
        unit_price: decimal(220),
        created_at: dateAtUtc(2026, 3, 14, 14, 10),
      },
    }),
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice3.invoice_id,
        item_type: item_type.assessment,
        description: 'Child anxiety screening session',
        qty: 1,
        unit_price: decimal(290),
        created_at: dateAtUtc(2026, 3, 14, 14, 15),
      },
    }),
    prisma.invoice_item.create({
      data: {
        invoice_id: invoice3.invoice_id,
        item_type: item_type.drug,
        description: 'Fluoxetine 10 mg capsule',
        qty: 14,
        unit_price: decimal(15.75),
        prescription_item_id: prescriptionItems[2].prescription_item_id,
        created_at: dateAtUtc(2026, 3, 14, 14, 20),
      },
    }),
  ]);

  await Promise.all([
    prisma.payment.create({
      data: {
        invoice_id: invoice1.invoice_id,
        amount: decimal(755),
        method: 'qr_code',
        status: payment_status.confirmed,
        confirmed_by: adminStaff.staff_id,
        confirmed_at: dateAtUtc(2026, 3, 12, 11, 5),
        payment_date: dateAtUtc(2026, 3, 12, 11, 0),
      },
    }),
    prisma.payment.create({
      data: {
        invoice_id: invoice2.invoice_id,
        amount: decimal(510),
        method: 'bank_transfer',
        status: payment_status.confirmed,
        confirmed_by: adminStaff.staff_id,
        confirmed_at: dateAtUtc(2026, 3, 13, 11, 50),
        payment_date: dateAtUtc(2026, 3, 13, 11, 40),
      },
    }),
    prisma.payment.create({
      data: {
        invoice_id: invoice3.invoice_id,
        amount: decimal(350),
        method: 'qr_code',
        status: payment_status.pending,
        slip_image: 'https://example.com/slips/payment-3.png',
        payment_date: dateAtUtc(2026, 3, 14, 15, 10),
      },
    }),
  ]);

  const childOwnerMap = new Map(
    childParentLinks.map(([child, parent]) => [child.child_id, parent]),
  );

  const extraSchedules = await Promise.all(
    Array.from({ length: 36 }, (_, index) => {
      const staffPool = [staffRecords[1], staffRecords[2], staffRecords[5], staffRecords[6]];
      const timeSlots = [
        [8, 30],
        [9, 30],
        [10, 30],
        [13, 0],
        [14, 0],
        [15, 0],
      ] as const;
      const [hour, minute] = timeSlots[index % timeSlots.length];
      const statusCycle = [slot_status.booked, slot_status.available, slot_status.booked];
      const assignedStatus =
        index % 11 === 0 ? slot_status.blocked : statusCycle[index % statusCycle.length];
      const workDateOffset = 7 + Math.floor(index / 3);

      return prisma.work_schedules.create({
        data: {
          staff_id: staffPool[index % staffPool.length].staff_id,
          work_date: daysFromToday(workDateOffset),
          start_time: timeAtUtc(hour, minute),
          end_time: timeAtUtc(hour + 1, minute),
          slot_status: assignedStatus,
        },
      });
    }),
  );
  schedules.push(...extraSchedules);

  const extraAppointments = await Promise.all(
    extraSchedules
      .filter((schedule) => schedule.slot_status !== slot_status.blocked)
      .slice(0, 24)
      .map((schedule, index) => {
        const child = children[index % children.length];
        const owner = childOwnerMap.get(child.child_id)!;
        const statusRoll = index % 6;
        const status =
          statusRoll <= 2
            ? appointment_status.completed
            : statusRoll <= 4
              ? appointment_status.scheduled
              : appointment_status.cancelled;
        const approval =
          status === appointment_status.cancelled
            ? approval_status.rejected
            : status === appointment_status.completed || index % 2 === 0
              ? approval_status.approved
              : approval_status.pending;

        return prisma.appointments.create({
          data: {
            patient_id: child.child_id,
            schedule_id: schedule.schedule_id,
            room_id: rooms[index % rooms.length].room_id,
            booked_by_user_id: owner.user_id,
            status,
            approval_status: approval,
            created_at: daysFromToday(1 + Math.floor(index / 2), 8 + (index % 7), 10),
          },
        });
      }),
  );
  appointments.push(...extraAppointments);

  const completedExtraAppointments = extraAppointments.filter(
    (appointment) =>
      appointment.status === appointment_status.completed &&
      appointment.approval_status === approval_status.approved,
  );

  const diagnosisPool = [
    'Attention regulation remains inconsistent across morning routines.',
    'Emotional outbursts increase during homework and transitions.',
    'Sleep onset remains delayed with daytime fatigue.',
    'Anxiety symptoms increase before school presentations.',
    'Sensory sensitivity affects classroom participation.',
    'Social communication difficulties require structured coaching.',
  ];
  const treatmentPool = [
    'Review parent behavior log and reinforce consistent bedtime routine.',
    'Coordinate with school counselor and update classroom accommodation plan.',
    'Continue weekly psychotherapy and home coping practice.',
    'Schedule medication review in 4 weeks with symptom tracker.',
    'Encourage sensory breaks and structured visual routine at home.',
    'Provide parent coaching session focused on transitions and regulation.',
  ];
  const servicePool = [
    'Child psychiatry follow-up consultation',
    'Developmental behavior review',
    'Psychology therapy session',
    'Medication counseling and monitoring',
    'Family counseling session',
    'Functional behavior planning review',
  ];
  const assessmentPool = [
    'Executive function screening',
    'Behavior rating review',
    'Anxiety symptom review',
    'Sleep and mood monitoring review',
  ];

  for (const [index, appointment] of completedExtraAppointments.entries()) {
    const visitDate = new Date(
      appointment.created_at
        ? new Date(appointment.created_at).getTime() + 1000 * 60 * (45 + index * 3)
        : daysFromToday(10 + index, 9, 0).getTime(),
    );

    const visit = await prisma.visit.create({
      data: {
        appointment_id: appointment.appointment_id,
        visit_date: visitDate,
      },
    });

    await prisma.vital_signs.create({
      data: {
        visit_id: visit.visit_id,
        weight_kg: decimal(20.5 + index * 0.7),
        height_cm: decimal(112 + index * 1.4),
        bp_systolic: 94 + (index % 9),
        bp_diastolic: 58 + (index % 7),
        heart_rate: 80 + (index % 14),
        note: `Follow-up visit ${index + 1}: parent reports gradual improvement with some ongoing concerns.`,
        created_at: visitDate,
      },
    });

    await prisma.diagnose.createMany({
      data: [
        {
          visit_id: visit.visit_id,
          diagnosis_text: diagnosisPool[index % diagnosisPool.length],
        },
        {
          visit_id: visit.visit_id,
          diagnosis_text: diagnosisPool[(index + 2) % diagnosisPool.length],
        },
      ],
    });

    await prisma.treatment_plan.createMany({
      data: [
        {
          visit_id: visit.visit_id,
          plan_detail: treatmentPool[index % treatmentPool.length],
        },
        {
          visit_id: visit.visit_id,
          plan_detail: treatmentPool[(index + 3) % treatmentPool.length],
        },
      ],
    });

    const prescription = await prisma.prescription.create({
      data: { visit_id: visit.visit_id },
    });

    const prescribedDrugs = [drugs[index % drugs.length], drugs[(index + 4) % drugs.length]];
    const prescribedQuantities = [14 + (index % 3) * 7, 10 + (index % 4) * 5];

    const extraPrescriptionItems = await Promise.all(
      prescribedDrugs.map((drug, itemIndex) =>
        prisma.prescription_item.create({
          data: {
            prescription_id: prescription.prescription_id,
            drug_id: drug.drug_id,
            quantity: prescribedQuantities[itemIndex],
          },
        }),
      ),
    );

    await prisma.dispense.create({
      data: {
        prescription_id: prescription.prescription_id,
        staff_id: staffRecords[3].staff_id,
      },
    });

    const serviceAmount = 240 + index * 12;
    const assessmentAmount = 120 + (index % assessmentPool.length) * 35;
    const drugAmount = extraPrescriptionItems.reduce((sum, item, itemIndex) => {
      const price = Number(prescribedDrugs[itemIndex].unit_price);
      return sum + price * Number(item.quantity ?? 0);
    }, 0);
    const invoiceTotal = serviceAmount + assessmentAmount + drugAmount;
    const invoiceStatusCycle = [
      invoice_status.paid,
      invoice_status.partially_paid,
      invoice_status.unpaid,
    ];
    const invoiceStatus = invoiceStatusCycle[index % invoiceStatusCycle.length];

    const invoice = await prisma.invoice.create({
      data: {
        visit_id: visit.visit_id,
        total_amount: decimal(invoiceTotal),
        status: invoiceStatus,
      },
    });

    await prisma.invoice_item.createMany({
      data: [
        {
          invoice_id: invoice.invoice_id,
          item_type: item_type.service,
          description: servicePool[index % servicePool.length],
          qty: 1,
          unit_price: decimal(serviceAmount),
          created_at: visitDate,
        },
        {
          invoice_id: invoice.invoice_id,
          item_type: item_type.assessment,
          description: assessmentPool[index % assessmentPool.length],
          qty: 1,
          unit_price: decimal(assessmentAmount),
          created_at: visitDate,
        },
        ...extraPrescriptionItems.map((item, itemIndex) => ({
          invoice_id: invoice.invoice_id,
          item_type: item_type.drug,
          description: `${prescribedDrugs[itemIndex].name} ${prescribedDrugs[itemIndex].dose}`,
          qty: Number(item.quantity ?? 0),
          unit_price: prescribedDrugs[itemIndex].unit_price,
          created_at: visitDate,
          prescription_item_id: item.prescription_item_id,
        })),
      ],
    });

    if (invoiceStatus === invoice_status.paid) {
      await prisma.payment.create({
        data: {
          invoice_id: invoice.invoice_id,
          amount: decimal(invoiceTotal),
          method: index % 2 === 0 ? 'qr_code' : 'bank_transfer',
          status: payment_status.confirmed,
          confirmed_by: adminStaff.staff_id,
          confirmed_at: new Date(visitDate.getTime() + 1000 * 60 * 90),
          payment_date: new Date(visitDate.getTime() + 1000 * 60 * 75),
        },
      });
    } else if (invoiceStatus === invoice_status.partially_paid) {
      await prisma.payment.create({
        data: {
          invoice_id: invoice.invoice_id,
          amount: decimal(invoiceTotal * 0.45),
          method: 'qr_code',
          status: payment_status.pending,
          slip_image: `https://example.com/slips/seed-slip-${invoice.invoice_id}.png`,
          payment_date: new Date(visitDate.getTime() + 1000 * 60 * 120),
        },
      });
    }
  }

  const allUsers = await prisma.users.findMany({ orderBy: { user_id: 'asc' } });
  const notifications = [
    {
      userId: adminUser.user_id,
      title: 'System summary ready',
      message: 'Today has 2 scheduled appointments and 2 open slots remaining.',
      genre: 'system',
      createdAt: dateAtUtc(2026, 3, 16, 7, 0),
    },
    {
      userId: allUsers.find((user) => user.username === 'dr.pimchanok')!.user_id,
      title: 'Upcoming follow-up',
      message: 'Fahsai Suwan follow-up starts at 14:00 on March 17.',
      genre: 'appointment',
      createdAt: dateAtUtc(2026, 3, 16, 8, 0),
    },
    {
      userId: allUsers.find((user) => user.username === 'nurse.suda')!.user_id,
      title: 'Medication ready',
      message: 'Prescription for Kawin Jaidee has been prepared for pickup.',
      genre: 'pharmacy',
      createdAt: dateAtUtc(2026, 3, 12, 10, 45),
    },
    {
      userId: allUsers.find((user) => user.username === '1103700000029')!.user_id,
      title: 'Visit completed',
      message: 'Thanwa Preecha visit notes are ready in the parent portal.',
      genre: 'visit',
      createdAt: dateAtUtc(2026, 3, 13, 16, 5),
    },
    {
      userId: allUsers.find((user) => user.username === '1103700000045')!.user_id,
      title: 'Appointment reminder',
      message: 'Punn Rattanakorn has an appointment at 09:00 on March 16.',
      genre: 'appointment',
      createdAt: dateAtUtc(2026, 3, 15, 18, 0),
    },
    ...allUsers.slice(0, 12).map((user, index) => ({
      userId: user.user_id,
      title: `Seeded update ${index + 1}`,
      message:
        index % 2 === 0
          ? 'Additional seeded clinic activity has been added to this account.'
          : 'New follow-up records, prescriptions, and invoices are available in the portal.',
      genre: index % 2 === 0 ? 'system' : 'visit',
      createdAt: daysFromToday(-(index % 5), 9 + (index % 6), 15),
    })),
  ];

  for (const notification of notifications) {
    await prisma.notifications.create({
      data: {
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        genre: notification.genre,
        created_at: notification.createdAt,
      },
    });
  }

  const counts = await Promise.all([
    prisma.users.count(),
    prisma.roles.count(),
    prisma.user_roles.count(),
    prisma.staff.count(),
    prisma.parent.count(),
    prisma.child.count(),
    prisma.work_schedules.count(),
    prisma.appointments.count(),
    prisma.visit.count(),
    prisma.assessment.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
  ]);

  console.log(
    'Seed complete:',
    JSON.stringify(
      {
        users: counts[0],
        roles: counts[1],
        userRoles: counts[2],
        staff: counts[3],
        parents: counts[4],
        children: counts[5],
        schedules: counts[6],
        appointments: counts[7],
        visits: counts[8],
        assessments: counts[9],
        invoices: counts[10],
        payments: counts[11],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
