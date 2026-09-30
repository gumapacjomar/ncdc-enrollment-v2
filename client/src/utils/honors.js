// ============================================================
// HONOR STUDENT DETECTION — DepEd-Compliant
// ============================================================
// DepEd Order No. 36, s. 2016 (Elementary)
//
// With Highest Honors: Ave ≥ 98, walay grade below 90
// With High Honors:    Ave ≥ 95, walay grade below 90
// With Honors:         Ave ≥ 90, walay grade below 85
// ============================================================

export const HONOR_TIERS = {
    HIGHEST: { 
        label: 'With Highest Honors', 
        shortLabel: '🏆 Highest',
        minAverage: 98, 
        minSubjectGrade: 90,
        color: '#92400e', 
        bg: '#fef3c7',
        border: '#f59e0b',
        icon: '🏆',
        rank: 1
    },
    HIGH: { 
        label: 'With High Honors', 
        shortLabel: '🥇 High',
        minAverage: 95, 
        minSubjectGrade: 90,
        color: '#1a56db', 
        bg: '#dbeafe',
        border: '#3b82f6',
        icon: '🥇',
        rank: 2
    },
    WITH_HONORS: { 
        label: 'With Honors', 
        shortLabel: '🥈 Honors',
        minAverage: 90, 
        minSubjectGrade: 85,
        color: '#065f46', 
        bg: '#d1fae5',
        border: '#10b981',
        icon: '🥈',
        rank: 3
    },
    NONE: { 
        label: 'Regular', 
        shortLabel: '—',
        minAverage: 0, 
        minSubjectGrade: 0,
        color: '#6b7280', 
        bg: '#f3f4f6',
        border: '#d1d5db',
        icon: '',
        rank: 99
    }
};

/**
 * Get honor tier base sa average + lowest subject grade
 * @param {number} average - Overall average grade
 * @param {number} lowestSubjectGrade - Lowest grade sa tanan subjects
 * @returns {object} - HONOR_TIERS entry
 */
export const getHonorTier = (average, lowestSubjectGrade) => {
    const avg = parseFloat(average);
    const lowest = parseFloat(lowestSubjectGrade);

    if (isNaN(avg) || isNaN(lowest)) return HONOR_TIERS.NONE;

    // Check Highest Honors
    if (avg >= 98 && lowest >= 90) {
        return HONOR_TIERS.HIGHEST;
    }
    // Check High Honors
    if (avg >= 95 && lowest >= 90) {
        return HONOR_TIERS.HIGH;
    }
    // Check With Honors
    if (avg >= 90 && lowest >= 85) {
        return HONOR_TIERS.WITH_HONORS;
    }

    return HONOR_TIERS.NONE;
};

/**
 * Compute honor tier from a list of subject averages
 * @param {Array} subjects - Array of { subject, finalAve }
 * @returns {object} - { tier, average, lowestGrade, isHonor, subjects }
 */
export const computeHonorFromSubjects = (subjects) => {
    if (!subjects || subjects.length === 0) {
        return {
            tier: HONOR_TIERS.NONE,
            average: 0,
            lowestGrade: 0,
            isHonor: false,
            subjects: []   // ✅ FIX: Return empty array para dili mo-crash
        };
    }

    // Filter subjects with valid finalAve
    const validSubjects = subjects.filter(s => s.finalAve !== null && s.finalAve !== undefined);
    if (validSubjects.length === 0) {
        return {
            tier: HONOR_TIERS.NONE,
            average: 0,
            lowestGrade: 0,
            isHonor: false,
            subjects: []   // ✅ FIX
        };
    }

    const aves = validSubjects.map(s => parseFloat(s.finalAve));
    const average = (aves.reduce((a, b) => a + b, 0) / aves.length).toFixed(2);
    const lowestGrade = Math.min(...aves);

    const tier = getHonorTier(average, lowestGrade);

    return {
        tier,
        average: parseFloat(average),
        lowestGrade,
        isHonor: tier !== HONOR_TIERS.NONE,
        subjects: validSubjects   // ✅ FIX: Include para sa display
    };
};

/**
 * Compute honor from raw grades (naay quarter/term)
 * @param {Array} grades - Array of { subject, grade, quarter }
 * @returns {object} - { tier, average, lowestGrade, isHonor, subjects }
 */
export const computeHonorFromGrades = (grades) => {
    if (!grades || grades.length === 0) {
        return {
            tier: HONOR_TIERS.NONE,
            average: 0,
            lowestGrade: 0,
            isHonor: false,
            subjects: []
        };
    }

    // Group grades by subject
    const subjectMap = {};
    grades.forEach(g => {
        if (!subjectMap[g.subject]) {
            subjectMap[g.subject] = [];
        }
        const val = parseFloat(g.grade);
        if (!isNaN(val)) {
            subjectMap[g.subject].push(val);
        }
    });

    // Compute subject averages
    const subjects = Object.entries(subjectMap).map(([subject, values]) => ({
        subject,
        finalAve: values.length > 0
            ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
            : null
    })).filter(s => s.finalAve !== null);

    return computeHonorFromSubjects(subjects);
};

/**
 * Sort honor students by tier rank, then by average
 */
export const sortHonorStudents = (students) => {
    return [...students].sort((a, b) => {
        // Sort by tier rank first (1 = highest)
        if (a.tier.rank !== b.tier.rank) {
            return a.tier.rank - b.tier.rank;
        }
        // Then by average descending
        return b.average - a.average;
    });
};

/**
 * Format honor tier for display
 */
export const formatHonorLabel = (tier, short = false) => {
    if (!tier || tier === HONOR_TIERS.NONE) return '—';
    return short ? tier.shortLabel : tier.label;
};

export default {
    HONOR_TIERS,
    getHonorTier,
    computeHonorFromSubjects,
    computeHonorFromGrades,
    sortHonorStudents,
    formatHonorLabel
};