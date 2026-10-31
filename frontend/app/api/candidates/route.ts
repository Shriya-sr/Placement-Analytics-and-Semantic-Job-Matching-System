import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    let candidateId = searchParams.get('candidate_id');

    if (!candidateId && session?.candidateId) {
      candidateId = String(session.candidateId);
    }

    if (!candidateId) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 });
    }

    const rows = await query<any[]>(
      `SELECT candidate_id, user_id, full_name, category, education_level, cgpa, phone, resume_text
       FROM candidates WHERE candidate_id = ? LIMIT 1`,
      [candidateId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Fetch skills for this candidate
    const skills = await query<any[]>(
      `SELECT s.skill_id, s.skill_name, s.category, cs.proficiency
       FROM candidate_skills cs
       JOIN skills s ON cs.skill_id = s.skill_id
       WHERE cs.candidate_id = ?
       ORDER BY s.skill_name ASC`,
      [candidateId]
    );

    // Fetch master list of all available skills for dropdown / autocomplete
    const allSkills = await query<any[]>(
      `SELECT skill_id, skill_name, category FROM skills ORDER BY skill_name ASC`
    );

    return NextResponse.json({
      success: true,
      candidate: rows[0],
      skills,
      allSkills,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  return handleUpdate(req);
}

export async function PUT(req: NextRequest) {
  return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Please sign in first' }, { status: 401 });
    }

    const body = await req.json();

    // Determine target candidateId: regular students can only update their own profile
    let targetCandidateId = session.candidateId;
    if (session.role === 'admin' && body.candidateId) {
      targetCandidateId = body.candidateId;
    }

    if (!targetCandidateId) {
      // Lookup candidateId from session.userId if not in token
      const cands = await query<any[]>('SELECT candidate_id FROM candidates WHERE user_id = ? LIMIT 1', [session.userId]);
      if (cands && cands.length > 0) {
        targetCandidateId = cands[0].candidate_id;
      }
    }

    if (!targetCandidateId) {
      return NextResponse.json({ error: 'No student candidate profile found for this account' }, { status: 404 });
    }

    const {
      fullName,
      phone,
      category,
      educationLevel,
      cgpa,
      resumeText,
      skills, // Array of { skillId?: number, skillName: string, proficiency: 'beginner' | 'intermediate' | 'expert' }
    } = body;

    // Database-level & application validation
    let parsedCgpa: number | null = null;
    if (cgpa !== undefined && cgpa !== null && cgpa !== '') {
      parsedCgpa = parseFloat(cgpa);
      if (isNaN(parsedCgpa) || parsedCgpa < 0.00 || parsedCgpa > 10.00) {
        return NextResponse.json(
          { error: 'Integrity Violation: CGPA must be a valid number between 0.00 and 10.00.' },
          { status: 400 }
        );
      }
    }

    // Execute atomic update across candidates and candidate_skills tables
    await withTransaction(async (conn) => {
      // 1. Update candidate biographical and academic attributes
      await conn.execute(
        `UPDATE candidates
         SET full_name = COALESCE(?, full_name),
             phone = ?,
             category = COALESCE(?, category),
             education_level = COALESCE(?, education_level),
             cgpa = ?,
             resume_text = ?
         WHERE candidate_id = ?`,
        [
          fullName || null,
          phone !== undefined ? phone : null,
          category || null,
          educationLevel || null,
          parsedCgpa,
          resumeText !== undefined ? resumeText : null,
          targetCandidateId,
        ]
      );

      // 2. If skills array is supplied, synchronize candidate_skills bridge table
      if (Array.isArray(skills)) {
        // Remove existing skills for this candidate
        await conn.execute('DELETE FROM candidate_skills WHERE candidate_id = ?', [targetCandidateId]);

        for (const item of skills) {
          const rawName = (item.skillName || '').trim();
          if (!rawName) continue;

          let skillId = item.skillId;
          const prof = ['beginner', 'intermediate', 'expert'].includes(item.proficiency)
            ? item.proficiency
            : 'intermediate';

          if (!skillId) {
            // Find existing skill by name (case-insensitive) or insert into master skills
            const [matched]: any = await conn.execute(
              'SELECT skill_id FROM skills WHERE LOWER(skill_name) = LOWER(?) LIMIT 1',
              [rawName]
            );
            if (matched && matched.length > 0) {
              skillId = matched[0].skill_id;
            } else {
              const [ins]: any = await conn.execute(
                'INSERT INTO skills (skill_name, category) VALUES (?, ?)',
                [rawName, item.category || 'General']
              );
              skillId = ins.insertId;
            }
          }

          if (skillId) {
            await conn.execute(
              'INSERT INTO candidate_skills (candidate_id, skill_id, proficiency) VALUES (?, ?, ?)',
              [targetCandidateId, skillId, prof]
            );
          }
        }
      }
    });

    // Fetch refreshed candidate & skills
    const updatedCandidateRows = await query<any[]>(
      `SELECT candidate_id, user_id, full_name, category, education_level, cgpa, phone, resume_text
       FROM candidates WHERE candidate_id = ?`,
      [targetCandidateId]
    );

    const updatedSkills = await query<any[]>(
      `SELECT s.skill_id, s.skill_name, s.category, cs.proficiency
       FROM candidate_skills cs
       JOIN skills s ON cs.skill_id = s.skill_id
       WHERE cs.candidate_id = ?
       ORDER BY s.skill_name ASC`,
      [targetCandidateId]
    );

    return NextResponse.json({
      success: true,
      message: 'Profile and skill set updated successfully! MySQL trigger trg_before_candidate_update verified.',
      candidate: updatedCandidateRows[0],
      skills: updatedSkills,
    });
  } catch (err: any) {
    console.error('Candidate update error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update candidate profile' },
      { status: 500 }
    );
  }
}
