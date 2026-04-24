export const javaPracticeUnits = [
  {
    id: "basics",
    unit: "Unit 1",
    title: "Java Basics and OOP Foundations",
    semester: "Sem 4",
    subjectCode: "3140705",
    difficulty: "Beginner",
    examWeight: "High",
    whyItMatters:
      "Build confidence with syntax, classes, objects, constructors, and method flow before moving into advanced GTU questions.",
    concepts: [
      "JDK, JVM, and JRE differences",
      "Data types, operators, and control flow",
      "Classes, objects, constructors, and methods",
      "Encapsulation, inheritance, polymorphism, abstraction",
    ],
    practice: [
      "Write a class for a BankAccount with deposit and withdraw methods.",
      "Explain compile-time polymorphism with a short overloaded method example.",
      "Trace the output of nested loops and conditional branches.",
    ],
    viva: [
      "Why is Java called platform independent?",
      "What is the difference between method overloading and overriding?",
    ],
    snippet: `class Student {\n  String name;\n  int semester;\n\n  Student(String name, int semester) {\n    this.name = name;\n    this.semester = semester;\n  }\n\n  void display() {\n    System.out.println(name + " - Sem " + semester);\n  }\n}`,
  },
  {
    id: "strings-arrays",
    unit: "Unit 2",
    title: "Arrays, Strings, and Exception Handling",
    semester: "Sem 4",
    subjectCode: "3140705",
    difficulty: "Beginner",
    examWeight: "Medium",
    whyItMatters:
      "This unit powers many short-answer and debugging questions where GTU asks you to reason about output and runtime safety.",
    concepts: [
      "Single and multidimensional arrays",
      "String vs StringBuffer vs StringBuilder",
      "try-catch-finally and custom exceptions",
      "Command line arguments",
    ],
    practice: [
      "Reverse an array without using extra array storage.",
      "Differentiate checked and unchecked exceptions with examples.",
      "Write a menu-driven string utility program.",
    ],
    viva: [
      "Why are strings immutable in Java?",
      "When should we use finally?",
    ],
    snippet: `try {\n  int result = marks[0] / divisor;\n  System.out.println(result);\n} catch (ArithmeticException ex) {\n  System.out.println("Divisor cannot be zero");\n} finally {\n  System.out.println("Evaluation complete");\n}`,
  },
  {
    id: "packages-threads",
    unit: "Unit 3",
    title: "Packages, Interfaces, and Multithreading",
    semester: "Sem 4",
    subjectCode: "3140705",
    difficulty: "Intermediate",
    examWeight: "High",
    whyItMatters:
      "GTU frequently mixes theory and coding here, so students need both definitions and quick implementation recall.",
    concepts: [
      "Package creation and access modifiers",
      "Abstract classes and interfaces",
      "Thread life cycle and synchronization",
      "Runnable interface vs Thread class",
    ],
    practice: [
      "Create an interface-based shape calculator.",
      "Show thread creation using both Runnable and Thread.",
      "Explain synchronization with a ticket-booking example.",
    ],
    viva: [
      "Can a class implement multiple interfaces?",
      "What problem does synchronization solve?",
    ],
    snippet: `class Counter {\n  private int value = 0;\n\n  synchronized void increment() {\n    value++;\n  }\n\n  int getValue() {\n    return value;\n  }\n}`,
  },
  {
    id: "collections-files",
    unit: "Unit 4",
    title: "Collections and File Handling",
    semester: "Sem 4",
    subjectCode: "3140705",
    difficulty: "Intermediate",
    examWeight: "Medium",
    whyItMatters:
      "Strong collection basics and file operations help with practical exams and mini-project work beyond theory papers.",
    concepts: [
      "List, Set, and Map overview",
      "ArrayList and HashMap usage",
      "Reading and writing text files",
      "Serialization basics",
    ],
    practice: [
      "Store student marks using HashMap and print topper details.",
      "Read a text file and count words line by line.",
      "Compare ArrayList and LinkedList in tabular form.",
    ],
    viva: [
      "When do we prefer Set over List?",
      "What is serialization in Java?",
    ],
    snippet: `ArrayList<String> topics = new ArrayList<>();\ntopics.add("Inheritance");\ntopics.add("Threads");\nfor (String topic : topics) {\n  System.out.println(topic);\n}`,
  },
  {
    id: "jdbc-awt",
    unit: "Unit 5",
    title: "JDBC and Event-Driven Java",
    semester: "Sem 4",
    subjectCode: "3140705",
    difficulty: "Advanced",
    examWeight: "High",
    whyItMatters:
      "This connects Java theory to real applications and commonly shows up in practicals, lab viva, and long-form answers.",
    concepts: [
      "JDBC architecture and driver flow",
      "Connection, Statement, and ResultSet",
      "Event handling basics",
      "Simple GUI interaction concepts",
    ],
    practice: [
      "Write JDBC steps to fetch records from a student table.",
      "Explain event delegation model in simple language.",
      "Differentiate Statement and PreparedStatement.",
    ],
    viva: [
      "Why is PreparedStatement preferred in many cases?",
      "What is the role of a listener in event handling?",
    ],
    snippet: `Connection con = DriverManager.getConnection(url, user, password);\nPreparedStatement ps = con.prepareStatement(\n  "SELECT name, spi FROM students WHERE semester = ?"\n);\nps.setInt(1, 4);\nResultSet rs = ps.executeQuery();`,
  },
];

export const javaPracticeStats = [
  { label: "GTU Units", value: "5" },
  { label: "Practice Tracks", value: "15+" },
  { label: "Viva Prompts", value: "10" },
  { label: "Code Drills", value: "25+" },
];

export const javaWeeklyPlan = [
  {
    day: "Day 1",
    focus: "Basics + OOP",
    action: "Revise class design and solve 3 output-based questions.",
  },
  {
    day: "Day 2",
    focus: "Strings + Arrays",
    action: "Practice 2 dry-runs and 2 exception-handling answers.",
  },
  {
    day: "Day 3",
    focus: "Interfaces + Threads",
    action: "Write one thread program and one theory comparison table.",
  },
  {
    day: "Day 4",
    focus: "Collections + Files",
    action: "Code one ArrayList example and one file-reading example.",
  },
  {
    day: "Day 5",
    focus: "JDBC + Events",
    action: "Memorize connection flow and prepare viva-ready explanations.",
  },
];

export const javaResourcePack = [
  {
    title: "Chapter 1 - Basic of Java",
    type: "Core theory",
    fileName: "CHAPTER 1-Basic of Java.pdf",
    use: "Start here for syntax, structure, and Java fundamentals.",
  },
  {
    title: "Chapter 3 - Basics of Object Oriented Programming",
    type: "Core theory",
    fileName: "CHAPTER 3- Basics of Object Oriented Programming .pdf",
    use: "Revise class-object thinking and major OOP principles.",
  },
  {
    title: "Static and this",
    type: "Presentation",
    fileName: "java_Chap_3 static&this.pptx",
    use: "Quick revision for commonly asked concept-based questions.",
  },
  {
    title: "Arrays and Strings",
    type: "Practice notes",
    fileName: "java-notes-Array and String.pdf",
    use: "Useful for output-based questions and short practical programs.",
  },
  {
    title: "Exception Handling",
    type: "Theory + coding",
    fileName: "CHAPTER 5 -Exception Handling.docx.pdf",
    use: "Prepare definitions, flow, and example-based answers.",
  },
  {
    title: "Java Collections",
    type: "Advanced topic",
    fileName: "java_collections.pdf",
    use: "Good for practical understanding beyond the base theory paper.",
  },
];

export const javaPracticeAssets = [
  {
    title: "GTU Question Paper",
    badge: "Exam",
    fileName: "BE04000231-2024.pdf",
    note: "Use this for previous-paper pattern practice and time-based revision.",
  },
  {
    title: "OOP Practical List",
    badge: "Practical",
    fileName: "OOP PRACTICAL LIST.docx.pdf",
    note: "Turn each practical into one coding drill inside Aura.",
  },
  {
    title: "Practical Dates",
    badge: "Schedule",
    fileName: "Practical dates 00P.pdf",
    note: "Good for planning reminders and readiness tracking.",
  },
  {
    title: "Assignment 1",
    badge: "Assignment",
    fileName: "OOP ASSIGNMENT 1.docx.pdf",
    note: "Use as beginner practice and concept recap.",
  },
  {
    title: "Assignment 2",
    badge: "Assignment",
    fileName: "OOP ASSIGNMENT 2.docx.pdf",
    note: "Add these questions to weekly self-tests.",
  },
  {
    title: "Assignment 3",
    badge: "Assignment",
    fileName: "OOP ASSIGNMENT 3.docx.pdf",
    note: "Best for mid-level implementation practice.",
  },
  {
    title: "Assignment 4",
    badge: "Assignment",
    fileName: "OOP ASSIGNMENT 4.docx.pdf",
    note: "Useful before internals and unit tests.",
  },
  {
    title: "Assignment 5",
    badge: "Assignment",
    fileName: "OOP ASSIGNMENT 5.docx.pdf",
    note: "Keep for advanced revision and lab prep.",
  },
];
