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
