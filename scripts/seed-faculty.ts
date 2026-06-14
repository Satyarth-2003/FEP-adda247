import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// ── Official Adda247 verticals ──
const VERTICALS = [
  { subjectId: "ssc",        name: "SSC",        description: "Staff Selection Commission (CGL, CHSL, MTS, GD)" },
  { subjectId: "foundation", name: "Foundation", description: "Class 6-12 academic foundation (CBSE/ICSE/State)" },
  { subjectId: "neet",       name: "NEET",       description: "NEET UG medical entrance" },
  { subjectId: "upsc",       name: "UPSC",       description: "Civil services, State PCS, UPPCS, BPSC" },
  { subjectId: "banking",    name: "Banking",    description: "IBPS, SBI, RBI and insurance exams" },
  { subjectId: "railway",    name: "Railway",    description: "RRB NTPC, ALP, Group D, JE" },
  { subjectId: "teaching",   name: "Teaching",   description: "CTET, TET, TGT, PGT, B.Ed" },
  { subjectId: "cuet",       name: "CUET",       description: "CUET UG and PG entrance" },
  { subjectId: "tech",       name: "Tech",       description: "GATE, ESE, ITI, JEE" },
  { subjectId: "ugc-net",    name: "UGC NET",    description: "UGC NET, JRF preparation" },
  { subjectId: "nursing",    name: "Nursing",    description: "Nursing entrance & AIIMS" },
];


interface FacultySeed {
  name: string;
  phone: string;
  email: string;
  teachingSubject: string;
  examTarget: string;
  vertical: string;
}

const FACULTY: FacultySeed[] = [
  { name: "Rana Mrituanjay Singh", phone: "9935177381", email: "ranamrityunjay2015@gmail.com", teachingSubject: "History", examTarget: "SSC, One Day Exam", vertical: "ssc" },
  { name: "Mayank Kumar", phone: "9140582792", email: "mayankpathak0098@gmail.com", teachingSubject: "Maths", examTarget: "Class 9-10", vertical: "foundation" },
  { name: "Prem Raj", phone: "8709131540", email: "prempipul7209@gmail.com", teachingSubject: "Biology", examTarget: "NEET", vertical: "neet" },
  { name: "Alok Gautam", phone: "6306213359", email: "aggautam93@gmail.com", teachingSubject: "English", examTarget: "Foundation", vertical: "foundation" },
  { name: "Sandeep Kumar", phone: "7011329909", email: "sksandeepraj936@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC", vertical: "ssc" },
  { name: "Lalit Yadav", phone: "7668750481", email: "lalityadav377433@gmail.com", teachingSubject: "Economy", examTarget: "SSC", vertical: "ssc" },
  { name: "Vishesh Verma", phone: "8957885514", email: "visheshverma2002real@gmail.com", teachingSubject: "Maths Foundation", examTarget: "Academic up to Class 10", vertical: "foundation" },
  { name: "Durga Tripathi", phone: "7974585746", email: "durgatripathi092@gmail.com", teachingSubject: "Biology", examTarget: "Teaching", vertical: "teaching" },
  { name: "Parthavi Dhawan", phone: "8178887646", email: "parthavidhawan29@gmail.com", teachingSubject: "Mathematics", examTarget: "Foundation", vertical: "foundation" },
  { name: "Piyush Kumar Singh", phone: "7985114398", email: "pksraghuvanshi18@gmail.com", teachingSubject: "GS", examTarget: "UPSC CSE", vertical: "upsc" },
  { name: "Gyanendra Tiwari", phone: "9289597892", email: "enlightengyan@gmail.com", teachingSubject: "Polity", examTarget: "UPSC / State PCS", vertical: "upsc" },
  { name: "Amresh Kumar Sinha", phone: "6202246044", email: "asinhabgp@gmail.com", teachingSubject: "History (Bihar Special)", examTarget: "BPSC, SSC", vertical: "ssc" },
  { name: "Mithun Kumar", phone: "9598946244", email: "mithunkumar46173@gmail.com", teachingSubject: "Geography", examTarget: "Geography (competitive)", vertical: "ssc" },
  { name: "Shubham Gupta", phone: "8077170988", email: "guptashubham0093@gmail.com", teachingSubject: "Maths", examTarget: "SSC", vertical: "ssc" },
  { name: "Ram Vibhor Mishra", phone: "9559984830", email: "ramvibhor060@gmail.com", teachingSubject: "History", examTarget: "UGC NET", vertical: "ugc-net" },
  { name: "Abhishek Kumar", phone: "8506014748", email: "abchauhan0802@gmail.com", teachingSubject: "Quantitative Aptitude", examTarget: "Banking", vertical: "banking" },
  { name: "Shashi Kumar Sah", phone: "9122634241", email: "shashismo91@gmail.com", teachingSubject: "Geography", examTarget: "Competitive Exams", vertical: "ssc" },
  { name: "Sandeep Verma", phone: "9162876007", email: "sv3274821@gmail.com", teachingSubject: "Political Science", examTarget: "CUET-UG, Class 12", vertical: "cuet" },
  { name: "Chandan Pandey", phone: "9628931110", email: "cpandey414@gmail.com", teachingSubject: "Geography", examTarget: "UGC NET", vertical: "ugc-net" },
  { name: "Tejus Soni", phone: "9587280859", email: "tejussoni91@gmail.com", teachingSubject: "Current Affairs & GS", examTarget: "Civil Services", vertical: "upsc" },
  { name: "Shivangi Sonkar", phone: "7985334252", email: "shivangi915sonkar@gmail.com", teachingSubject: "Biology", examTarget: "Class 10/12, NEET", vertical: "neet" },
  { name: "Brijesh Kumar", phone: "9235193962", email: "brijeshsir2959@gmail.com", teachingSubject: "Geography", examTarget: "UPPSC", vertical: "upsc" },
  { name: "Anshu Kumar", phone: "9304385258", email: "anshuking93043@gmail.com", teachingSubject: "Maths", examTarget: "State / CBSE Board", vertical: "foundation" },
  { name: "Shubham Srivastava", phone: "6306322361", email: "shubhamsrivastava0022@gmail.com", teachingSubject: "Maths", examTarget: "CBSE/ICSE 9-10", vertical: "foundation" },
  { name: "Uttam Singh", phone: "9758580899", email: "raghavuttam2111@gmail.com", teachingSubject: "History", examTarget: "SSC", vertical: "ssc" },
  { name: "Adarsh Bodana", phone: "8302452605", email: "adarshbodana85@gmail.com", teachingSubject: "Geography", examTarget: "UGC NET", vertical: "ugc-net" },
  { name: "Anamika Agrahari", phone: "9140792851", email: "anamikaanamikaagrahari62038@gmail.com", teachingSubject: "History", examTarget: "UPSSSC", vertical: "ssc" },
  { name: "Shivendra Singh", phone: "9793500617", email: "shivendra9793500617@gmail.com", teachingSubject: "Maths", examTarget: "Railway", vertical: "railway" },
  { name: "Ganesh Chandra Chaurasiya", phone: "8787293330", email: "bindassgcc@gmail.com", teachingSubject: "Biology", examTarget: "SSC", vertical: "ssc" },
  { name: "Deepak Sonu", phone: "7700820385", email: "sonud9125@gmail.com", teachingSubject: "Maths", examTarget: "Railway", vertical: "railway" },
  { name: "Pooja Kumari", phone: "9818915043", email: "poojakumari01201997@gmail.com", teachingSubject: "English", examTarget: "Academic Class 6-12", vertical: "foundation" },
  { name: "Numan Shahabuddin", phone: "9235835166", email: "haanclasses@gmail.com", teachingSubject: "Maths", examTarget: "CBSE Class 9-10", vertical: "foundation" },
  { name: "Divyanshu Tiwari", phone: "9173470937", email: "tiwaridivynshu@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC", vertical: "ssc" },
  { name: "Sunny Rai", phone: "9939715929", email: "raisunny524@gmail.com", teachingSubject: "Geography", examTarget: "SSC / RRB / BSSC", vertical: "ssc" },
  { name: "Saurabh Kumar Dwivedi", phone: "7007424399", email: "shubh29d@gmail.com", teachingSubject: "Maths", examTarget: "TGT", vertical: "teaching" },
  { name: "Suryakant Singh", phone: "9452792871", email: "drsurya2016@gmail.com", teachingSubject: "Biology", examTarget: "NEET UG", vertical: "neet" },
  { name: "Sagar", phone: "7828549239", email: "sagarpatva1007@gmail.com", teachingSubject: "Zoology / Botany", examTarget: "Class 11-12 NCERT, NEET", vertical: "neet" },
  { name: "Raj Kumar Raju", phone: "9065965757", email: "16btag115@gmail.com", teachingSubject: "Biology", examTarget: "Foundation", vertical: "foundation" },
  { name: "Namrata Mishra", phone: "8917088384", email: "namratamishra232@gmail.com", teachingSubject: "Political Science / Civics", examTarget: "CUET PG", vertical: "cuet" },
  { name: "Md Sarfraj Ali", phone: "9631928426", email: "mdsarfrajali02@gmail.com", teachingSubject: "Geography", examTarget: "Academic", vertical: "foundation" },
  { name: "Anoop Patel", phone: "7618898781", email: "ap2320575@gmail.com", teachingSubject: "History", examTarget: "TGT", vertical: "teaching" },
  { name: "Milan Kumar", phone: "8447354135", email: "milankumar008@gmail.com", teachingSubject: "Political Science / History / Geography / CA", examTarget: "CUET UG, SSC, Class 11-12", vertical: "cuet" },
  { name: "Vandana Singhal", phone: "6398214814", email: "vandanasinghal1811@gmail.com", teachingSubject: "Maths", examTarget: "Foundation 9-10", vertical: "foundation" },
  { name: "Sambhu Kumar", phone: "8292522520", email: "sambhukumar971@gmail.com", teachingSubject: "Maths", examTarget: "Academic CBSE 9-10", vertical: "foundation" },
  { name: "Ravendra Verma", phone: "7974402952", email: "ravendraverma1995@gmail.com", teachingSubject: "Building Material & Construction", examTarget: "Engineering", vertical: "tech" },
  { name: "Sachin Srivastava", phone: "8299016930", email: "sachinsrivastava1160@gmail.com", teachingSubject: "History", examTarget: "Foundation", vertical: "foundation" },
  { name: "Devendra Singh", phone: "9559474329", email: "nedevendra95@gmail.com", teachingSubject: "Chemistry", examTarget: "Hindi Medium Class 9-12", vertical: "foundation" },
  { name: "Shivanand Yadav", phone: "9795224657", email: "rajababushiva70@gmail.com", teachingSubject: "Mathematics", examTarget: "Foundation 6-10, SSC, One-Day Exams", vertical: "ssc" },
  { name: "Ved Prakash Bais", phone: "6393450386", email: "vedpbais2708@gmail.com", teachingSubject: "History", examTarget: "PGT, UGC NET", vertical: "ugc-net" },
  { name: "Yash Prajapati", phone: "7267932323", email: "yash.praj2000@gmail.com", teachingSubject: "Computer", examTarget: "ADDA247 ITI", vertical: "tech" },
  { name: "Sonam Kumari", phone: "6200384801", email: "sonam620038@gmail.com", teachingSubject: "Geography & Polity", examTarget: "SSC", vertical: "ssc" },
  { name: "Danish Hussain", phone: "8287752923", email: "danishhussain653@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC", vertical: "ssc" },
  { name: "Aditya Kumar", phone: "9006762842", email: "vanijya.aditya@gmail.com", teachingSubject: "Accountancy", examTarget: "K-12, CA & CMA", vertical: "foundation" },
  { name: "Dinesh Kumar Yadav", phone: "9161652812", email: "dky3805@gmail.com", teachingSubject: "Science", examTarget: "Railway", vertical: "railway" },
  { name: "Madhu Shakya", phone: "6397027680", email: "madhu.madhushakya@gmail.com", teachingSubject: "Mathematics", examTarget: "SSC CGL", vertical: "ssc" },
  { name: "Shoaib Khan", phone: "9340981449", email: "ershoaib59@kgpian.iitkgp.ac.in", teachingSubject: "Mechanical Engineering", examTarget: "GATE, SSC JE", vertical: "tech" },
  { name: "Deepak Kumar Dubey", phone: "7838505185", email: "deepak7838505185@gmail.com", teachingSubject: "Current Affairs / Geography", examTarget: "UPPCS / UPSC", vertical: "upsc" },
  { name: "Anil Kumar", phone: "8534000975", email: "anilku1094@gmail.com", teachingSubject: "Mathematics", examTarget: "SSC, Railway, Bank, State", vertical: "ssc" },
  { name: "Neha Goel", phone: "8447186352", email: "nehagoel030@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC", vertical: "ssc" },
  { name: "Kajal", phone: "8851126419", email: "k661kajal@gmail.com", teachingSubject: "CDP (Child Development & Pedagogy)", examTarget: "Teaching Exams", vertical: "teaching" },
  { name: "Tripti", phone: "8057635332", email: "triptimanjera8nov@gmail.com", teachingSubject: "Mathematics", examTarget: "Class 11-12", vertical: "foundation" },
  { name: "Shubham Kumar Maurya", phone: "7704837523", email: "stmusk1221@gmail.com", teachingSubject: "Multi-subject", examTarget: "Academics (Adda247 YT)", vertical: "foundation" },
  { name: "Ashutosh Srivastava", phone: "7985216985", email: "ashu14june@gmail.com", teachingSubject: "Polity & Modern History", examTarget: "State PCS", vertical: "upsc" },
  { name: "Shraddha Sharma", phone: "8840371565", email: "shraddhasharma8840@gmail.com", teachingSubject: "CDP", examTarget: "CTET", vertical: "teaching" },
  { name: "Ashish Kumar Saxena", phone: "7080806134", email: "ashishsaxena.adda@gmail.com", teachingSubject: "Geography", examTarget: "Teaching Exam", vertical: "teaching" },
  { name: "Akash Pandey", phone: "9140683075", email: "pandeyakash546@gmail.com", teachingSubject: "English & Social Science", examTarget: "Academics", vertical: "foundation" },
  { name: "Priya Gupta", phone: "7704030689", email: "pgupta888@gmail.com", teachingSubject: "Biology (Botany & Zoology)", examTarget: "Class 9-10 Academic", vertical: "foundation" },
  { name: "Nitesh Kumar", phone: "9534065435", email: "niteshwrites09@gmail.com", teachingSubject: "English", examTarget: "SSC / Bank", vertical: "banking" },
  { name: "Astha Singh", phone: "7752825471", email: "asthasingh12210@gmail.com", teachingSubject: "History & Current Affairs", examTarget: "SSC", vertical: "ssc" },
  { name: "Akansha Mishra", phone: "9616608950", email: "mishraakansha2204@gmail.com", teachingSubject: "Reasoning", examTarget: "Banking", vertical: "banking" },
  { name: "Tulsi Singh", phone: "9555741181", email: "kanttulsi03@gmail.com", teachingSubject: "All Nursing Subjects", examTarget: "Nursing", vertical: "nursing" },
  { name: "Vaishali Dixit", phone: "8299471880", email: "vaishaleedixit911@gmail.com", teachingSubject: "Current Affairs / IR", examTarget: "UPSC / UPPCS", vertical: "upsc" },
  { name: "Hansraj Meena", phone: "7879451250", email: "hansraj7879451250@gmail.com", teachingSubject: "Maths / Reasoning", examTarget: "Railway, SSC, Bank, One-day", vertical: "railway" },
  { name: "Anshuman", phone: "9717249886", email: "anshuman.kumarr@gmail.com", teachingSubject: "Geography", examTarget: "Teaching Exams", vertical: "teaching" },
  { name: "Damini Singh", phone: "8881034410", email: "daminijnp01@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC", vertical: "ssc" },
  { name: "Sumit", phone: "9068191757", email: "sumitmunjal63@gmail.com", teachingSubject: "Mathematics", examTarget: "Teaching Exams", vertical: "teaching" },
  { name: "Rakesh Kumar Yadav", phone: "9807385434", email: "rakeshyadavme@gmail.com", teachingSubject: "TOM, RAC, HMT, ICE", examTarget: "Mechanical Engineering", vertical: "tech" },
  { name: "Akanksha Kumari", phone: "9472896045", email: "akankshakumari582003@gmail.com", teachingSubject: "Sociology", examTarget: "CUET UG/PG", vertical: "cuet" },
  { name: "Rajni Devi", phone: "6393602973", email: "vermarajni03558@gmail.com", teachingSubject: "Hindi Vyakaran", examTarget: "Class 10-12 Academic", vertical: "foundation" },
  { name: "Rahul Upadhyay", phone: "6397251799", email: "rs9702761@gmail.com", teachingSubject: "Mathematics", examTarget: "Foundation up to Class 10", vertical: "foundation" },
  { name: "Rishabh Raja", phone: "9305229840", email: "rishabhrajadj1234@gmail.com", teachingSubject: "Polity", examTarget: "SSC", vertical: "ssc" },
  { name: "Divaroopa Mishra", phone: "9557682236", email: "mishradiva2024@gmail.com", teachingSubject: "Computer", examTarget: "SSC, CUET, UGC", vertical: "ssc" },
  { name: "Aniruddh Sharma", phone: "9305115362", email: "rahulpandit67023@gmail.com", teachingSubject: "Maths", examTarget: "Class 9-10", vertical: "foundation" },
  { name: "Ansh Dham", phone: "9897021641", email: "anshdham04@gmail.com", teachingSubject: "Physics", examTarget: "JEE / NEET", vertical: "neet" },
  { name: "Rohit Yadav", phone: "9134062670", email: "rkumarsc163@gmail.com", teachingSubject: "Mathematics", examTarget: "Class 9-10 Academic", vertical: "foundation" },
  { name: "Deepak Kumar", phone: "9798882457", email: "deepakkumar01052005@gmail.com", teachingSubject: "Physics & Chemistry", examTarget: "Foundation", vertical: "foundation" },
  { name: "Tezender Gulia", phone: "8696431618", email: "tezendergulia93@gmail.com", teachingSubject: "Political Science", examTarget: "CUET PG", vertical: "cuet" },
  { name: "Anas Rasheed", phone: "9506480698", email: "rasheedanas515@gmail.com", teachingSubject: "Reasoning", examTarget: "Reasoning (general)", vertical: "ssc" },
  { name: "Anubhav Singh", phone: "8299338171", email: "001anubhavthakur0@gmail.com", teachingSubject: "History & Polity", examTarget: "SSC, Defence", vertical: "ssc" },
  { name: "Mahendra Nagar", phone: "8770232537", email: "mahennagar11@gmail.com", teachingSubject: "Physics", examTarget: "Class 11-12, NEET", vertical: "neet" },
  { name: "Shubham Pandey", phone: "6392683465", email: "pandeygsibbu@gmail.com", teachingSubject: "CDP & Social Studies", examTarget: "Teaching Exams", vertical: "teaching" },
  { name: "Mohammad Shahnawaz", phone: "9634193607", email: "shahnawazmaulvi@gmail.com", teachingSubject: "Urdu, Arabic", examTarget: "CUET UG/PG, UGC NET, CTET", vertical: "cuet" },
];

const MANAGERS = [
  { name: "Roshan Singh", email: "roshan.singh@adda247.com" },
  { name: "Ayush Chauhan", email: "ayush.chauhan@adda247.com" },
];

async function emailExists(email: string): Promise<boolean> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: "fep-users",
      IndexName: "email-index",
      KeyConditionExpression: "email = :e",
      ExpressionAttributeValues: { ":e": email.toLowerCase().trim() },
      Limit: 1,
    })
  );
  return (res.Items?.length ?? 0) > 0;
}

async function clearSubjects() {
  const res = await ddb.send(new ScanCommand({ TableName: "fep-subjects" }));
  for (const item of res.Items ?? []) {
    await ddb.send(
      new DeleteCommand({
        TableName: "fep-subjects",
        Key: { subjectId: item.subjectId },
      })
    );
  }
}

async function main() {
  console.log("→ Resetting subjects to 11 official Adda247 verticals…");
  await clearSubjects();
  for (const v of VERTICALS) {
    await ddb.send(new PutCommand({ TableName: "fep-subjects", Item: v }));
  }
  console.log(`✓ Seeded ${VERTICALS.length} verticals\n`);

  console.log(`→ Seeding ${FACULTY.length} faculty (idempotent by email)…`);
  const password = await bcrypt.hash("fep123", 10);
  let created = 0;
  let skipped = 0;
  const verticalCounts: Record<string, number> = {};

  for (const f of FACULTY) {
    const email = f.email.toLowerCase().trim();
    if (await emailExists(email)) {
      skipped++;
      continue;
    }
    await ddb.send(
      new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(),
          name: f.name,
          email,
          phone: f.phone,
          role: "fep_faculty",
          subjects: [f.vertical],
          teachingSubject: f.teachingSubject,
          examTarget: f.examTarget,
          passwordHash: password,
          createdAt: new Date().toISOString(),
        },
      })
    );
    created++;
    verticalCounts[f.vertical] = (verticalCounts[f.vertical] ?? 0) + 1;
  }
  console.log(`✓ Created ${created}, skipped ${skipped} existing\n`);

  console.log("→ Ensuring managers exist…");
  let mgrCreated = 0;
  for (const m of MANAGERS) {
    if (await emailExists(m.email)) continue;
    await ddb.send(
      new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(),
          name: m.name,
          email: m.email,
          role: "fep_manager",
          subjects: [],
          passwordHash: password,
          createdAt: new Date().toISOString(),
        },
      })
    );
    mgrCreated++;
  }
  console.log(`✓ Managers ready (${mgrCreated} new)\n`);

  console.log("Vertical distribution:");
  for (const v of VERTICALS) {
    const c = verticalCounts[v.subjectId] ?? 0;
    if (c > 0) console.log(`  ${v.name.padEnd(34)} ${c}`);
  }

  console.log("\nLogin: any faculty email + password 'fep123'");
  console.log("Manager: roshan@fep.local / fep123");
}

main().catch(e => {
  console.error("Seed failed:", e);
  process.exit(1);
});
