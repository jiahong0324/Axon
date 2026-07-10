// Standard TAR UMT 5.6 Grading System (Applicable to June 2023 Year 1 Semester 1 intake AND onwards)
export const TARUMT_GRADES = [
  { grade: 'A+', point: 4.0000, markRange: '90 - 100', description: 'High Distinction' },
  { grade: 'A',  point: 4.0000, markRange: '80 - 89',  description: 'Distinction' },
  { grade: 'A-', point: 3.6700, markRange: '75 - 79',  description: 'Distinction' },
  { grade: 'B+', point: 3.3300, markRange: '70 - 74',  description: 'Merit' },
  { grade: 'B',  point: 3.0000, markRange: '65 - 69',  description: 'Merit' },
  { grade: 'B-', point: 2.6700, markRange: '60 - 64',  description: 'Merit' },
  { grade: 'C+', point: 2.3300, markRange: '55 - 59',  description: 'Pass' },
  { grade: 'C',  point: 2.0000, markRange: '50 - 54',  description: 'Pass' },
  { grade: 'F',  point: 0.0000, markRange: '0 - 49',   description: 'Fail' }
]

export function getGradePoint(gradeStr) {
  if (!gradeStr) return 0.0000
  const clean = String(gradeStr).trim().toUpperCase()
  const found = TARUMT_GRADES.find(g => g.grade === clean)
  return found ? found.point : 0.0000
}

export function calculateSemesterGPA(courses = []) {
  if (!Array.isArray(courses) || courses.length === 0) return { gpa: '0.0000', totalCredits: 0, totalPoints: 0 }
  let totalCredits = 0
  let totalPoints = 0
  for (const course of courses) {
    const credits = Number(course.credit_hours) || 0
    if (credits > 0) {
      const pt = getGradePoint(course.grade)
      totalCredits += credits
      totalPoints += credits * pt
    }
  }
  const gpaVal = totalCredits > 0 ? (totalPoints / totalCredits) : 0
  return {
    gpa: gpaVal.toFixed(4),
    totalCredits,
    totalPoints: Number(totalPoints.toFixed(4))
  }
}

export function calculateOverallCGPA(semestersWithCourses = []) {
  let overallCredits = 0
  let overallPoints = 0
  for (const sem of semestersWithCourses) {
    const courses = sem.courses || []
    for (const course of courses) {
      const credits = Number(course.credit_hours) || 0
      if (credits > 0) {
        const pt = getGradePoint(course.grade)
        overallCredits += credits
        overallPoints += credits * pt
      }
    }
  }
  const cgpaVal = overallCredits > 0 ? (overallPoints / overallCredits) : 0
  return {
    cgpa: cgpaVal.toFixed(4),
    overallCredits,
    overallPoints: Number(overallPoints.toFixed(4))
  }
}

export function getAcademicStanding(cgpaVal, totalCredits = 0) {
  const num = Number(cgpaVal) || 0
  if (totalCredits === 0) {
    return {
      title: 'No Recorded Credits',
      badge: 'Getting Started',
      color: 'from-slate-500 to-slate-700',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-500/30',
      bgLight: 'bg-slate-500/10',
      description: 'Add semester records or import your slip to track CGPA standing.'
    }
  }
  if (num >= 3.7500) {
    return {
      title: 'First Class Honours',
      badge: "President's List Potential",
      color: 'from-amber-400 via-yellow-400 to-orange-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      bgLight: 'bg-amber-500/15',
      description: 'Exceptional academic excellence exceeding 3.7500 TAR UMT CGPA threshold.'
    }
  }
  if (num >= 3.0000) {
    return {
      title: 'Second Class Upper Honours',
      badge: "Dean's List Standing",
      color: 'from-emerald-400 to-teal-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      bgLight: 'bg-emerald-500/15',
      description: 'Strong merit standing across semester coursework.'
    }
  }
  if (num >= 2.5000) {
    return {
      title: 'Second Class Lower Honours',
      badge: 'Good Standing',
      color: 'from-blue-400 to-cyan-500',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/40',
      bgLight: 'bg-blue-500/15',
      description: 'Satisfactory progress toward TAR UMT degree completion.'
    }
  }
  if (num >= 2.0000) {
    return {
      title: 'Third Class Honours / Pass',
      badge: 'Passing Standing',
      color: 'from-purple-400 to-indigo-500',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/40',
      bgLight: 'bg-purple-500/15',
      description: 'Meeting minimum graduation CGPA requirement (2.0000).'
    }
  }
  return {
    title: 'Academic Probation Risk',
    badge: 'Action Required',
    color: 'from-red-400 to-rose-600',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/40',
    bgLight: 'bg-red-500/15',
    description: 'CGPA below 2.0000 graduation threshold.'
  }
}

export function getGradeBadgeStyle(gradeStr) {
  const g = String(gradeStr || '').trim().toUpperCase()
  switch (g) {
    case 'A+':
    case 'A':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    case 'A-':
      return 'bg-teal-500/15 text-teal-300 border-teal-500/30'
    case 'B+':
    case 'B':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    case 'B-':
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
    case 'C+':
    case 'C':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    case 'F':
      return 'bg-red-500/15 text-red-300 border-red-500/30'
    default:
      return 'bg-white/5 text-slate-400 border-white/10'
  }
}
