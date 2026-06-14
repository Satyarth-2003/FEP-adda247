import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

interface FacultyEntry {
  name: string;
  phone: string;
  email: string;
  teachingSubject: string;
  examTarget: string;
}

// All June EduSkill faculty (deduplicated by email)
const JUNE_EduSkill: FacultyEntry[] = [
  { name: "Rana Mrituanjay Singh", phone: "9935177381", email: "ranamrityunjay2015@gmail.com", teachingSubject: "History", examTarget: "SSC, One Day Exam" },
  { name: "Mayank Kumar", phone: "9140582792", email: "mayankpathak0098@gmail.com", teachingSubject: "Maths", examTarget: "Class 9-10" },
  { name: "Prem Raj", phone: "8709131540", email: "prempipul7209@gmail.com", teachingSubject: "Biology", examTarget: "NEET" },
  { name: "Alok Gautam", phone: "6306213359", email: "aggautam93@gmail.com", teachingSubject: "English", examTarget: "Foundation" },
  { name: "Sandeep Kumar", phone: "7011329909", email: "sksandeepraj936@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC" },
  { name: "Lalit Yadav", phone: "7668750481", email: "lalityadav377433@gmail.com", teachingSubject: "Economy and Polity", examTarget: "SSC, Railway, Banking" },
  { name: "Vishesh Verma", phone: "8957885514", email: "visheshverma2002real@gmail.com", teachingSubject: "Maths Foundation", examTarget: "Academic up to Class 10" },
  { name: "Durga Tripathi", phone: "7974585746", email: "durgatripathi092@gmail.com", teachingSubject: "Biology", examTarget: "Teaching" },
  { name: "Parthavi Dhawan", phone: "8178887646", email: "parthavidhawan29@gmail.com", teachingSubject: "Mathematics", examTarget: "Foundation" },
  { name: "Piyush Kumar Singh", phone: "7985114398", email: "pksraghuvanshi18@gmail.com", teachingSubject: "GS", examTarget: "UPSC CSE" },
  { name: "Gyanendra Tiwari", phone: "9289597892", email: "enlightengyan@gmail.com", teachingSubject: "Polity", examTarget: "UPSC/State PCS" },
  { name: "Amresh Kumar Sinha", phone: "6202246044", email: "asinhabgp@gmail.com", teachingSubject: "History (Bihar Special)", examTarget: "BPSC, SSC" },
  { name: "Mithun Kumar", phone: "9598946244", email: "mithunkumar46173@gmail.com", teachingSubject: "Geography", examTarget: "Geography" },
  { name: "Shubham Gupta", phone: "8077170988", email: "guptashubham0093@gmail.com", teachingSubject: "Maths", examTarget: "SSC" },
  { name: "Ram Vibhor Mishra", phone: "9559984830", email: "ramvibhor060@gmail.com", teachingSubject: "History", examTarget: "UGC NET" },
  { name: "Abhishek Kumar", phone: "8506014748", email: "abchauhan0802@gmail.com", teachingSubject: "Quantitative Aptitude", examTarget: "Banking" },
  { name: "Shashi Kumar Sah", phone: "9122634241", email: "shashismo91@gmail.com", teachingSubject: "Maths", examTarget: "Competitive Exams" },
  { name: "Sandeep Verma", phone: "9162876007", email: "sv3274821@gmail.com", teachingSubject: "Political Science", examTarget: "CUET-UG, Class 12" },
  { name: "Chandan Pandey", phone: "9628931110", email: "cpandey414@gmail.com", teachingSubject: "Geography", examTarget: "UGC NET" },
  { name: "Tejus Soni", phone: "9587280859", email: "tejussoni91@gmail.com", teachingSubject: "Current Affairs & GS", examTarget: "Civil Services" },
  { name: "Shivangi Sonkar", phone: "7985334252", email: "shivangi915sonkar@gmail.com", teachingSubject: "Biology", examTarget: "Class 10/12, NEET" },
  { name: "Brijesh Kumar", phone: "9235193962", email: "brijeshsir2959@gmail.com", teachingSubject: "Geography", examTarget: "UPPSC" },
  { name: "Anshu Kumar", phone: "9304385258", email: "anshuking93043@gmail.com", teachingSubject: "Maths", examTarget: "State/CBSE Board" },
  { name: "Shubham Srivastava", phone: "6306322361", email: "shubhamsrivastava0022@gmail.com", teachingSubject: "Maths", examTarget: "Academic (9th/10th CBSE/ICSE)" },
  { name: "Uttam Singh", phone: "9758580899", email: "raghavuttam2111@gmail.com", teachingSubject: "GS", examTarget: "SSC" },
  { name: "Adarsh Bodana", phone: "8302452605", email: "adarshbodana85@gmail.com", teachingSubject: "Geography", examTarget: "UGC NET" },
  { name: "Anamika Agrahari", phone: "9140792851", email: "anamikaanamikaagrahari62038@gmail.com", teachingSubject: "History", examTarget: "UPSSSC" },
  { name: "Shivendra Singh", phone: "9793500617", email: "shivendra9793500617@gmail.com", teachingSubject: "Maths", examTarget: "Railway" },
  { name: "Ganesh Chandra Chaurasiya", phone: "8787293330", email: "bindassgcc@gmail.com", teachingSubject: "Biology", examTarget: "SSC, UP Board 9-12" },
  { name: "Deepak Sonu", phone: "7700820385", email: "sonud9125@gmail.com", teachingSubject: "Maths", examTarget: "Railway" },
  { name: "Pooja Kumari", phone: "9818915043", email: "poojakumari01201997@gmail.com", teachingSubject: "English", examTarget: "Academic (6-12)" },
  { name: "Numan Shahabuddin", phone: "9235835166", email: "haanclasses@gmail.com", teachingSubject: "Maths", examTarget: "CBSE Class 9-10" },
  { name: "Divyanshu Tiwari", phone: "9173470937", email: "tiwaridivynshu@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC" },
  { name: "Sunny Rai", phone: "9939715929", email: "raisunny524@gmail.com", teachingSubject: "Geography", examTarget: "SSC/RRB/BSSC" },
  { name: "Saurabh Kumar Dwivedi", phone: "7007424399", email: "shubh29d@gmail.com", teachingSubject: "Maths", examTarget: "TGT" },
  { name: "Suryakant Singh", phone: "9452792871", email: "drsurya2016@gmail.com", teachingSubject: "Biology", examTarget: "NEET UG" },
  { name: "Sagar", phone: "7828549239", email: "sagarpatva1007@gmail.com", teachingSubject: "Zoology & Botany", examTarget: "Class 11-12 NCERT, NEET" },
  { name: "Raj Kumar Raju", phone: "9065965757", email: "16btag115@gmail.com", teachingSubject: "Biology", examTarget: "Foundation" },
  { name: "Namrata Mishra", phone: "8917088384", email: "namratamishra232@gmail.com", teachingSubject: "Political Science/Civics", examTarget: "CUET PG" },
  { name: "Md Sarfraj Ali", phone: "9631928426", email: "mdsarfrajali02@gmail.com", teachingSubject: "Geography", examTarget: "Academic" },
  { name: "Anoop Patel", phone: "7618898781", email: "ap2320575@gmail.com", teachingSubject: "History", examTarget: "TGT" },
  { name: "Milan Kumar", phone: "8447354135", email: "milankumar008@gmail.com", teachingSubject: "Political Science, History, Geography, CA", examTarget: "CUET UG, SSC, Class 11-12" },
  { name: "Vandana Singhal", phone: "6398214814", email: "vandanasinghal1811@gmail.com", teachingSubject: "Maths", examTarget: "Foundation 9-10" },
  { name: "Sambhu Kumar", phone: "8292522520", email: "sambhukumar971@gmail.com", teachingSubject: "Maths", examTarget: "Academic (9th/10th CBSE)" },
  { name: "Ravendra Verma", phone: "7974402952", email: "ravendraverma1995@gmail.com", teachingSubject: "Building Material & Construction", examTarget: "Engineering" },
  { name: "Sachin Srivastava", phone: "8299016930", email: "sachinsrivastava1160@gmail.com", teachingSubject: "History", examTarget: "Foundation" },
  { name: "Devendra Singh", phone: "9559474329", email: "nedevendra95@gmail.com", teachingSubject: "Chemistry", examTarget: "Hindi Medium Class 9-12" },
  { name: "Shivanand Yadav", phone: "9795224657", email: "rajababushiva70@gmail.com", teachingSubject: "Mathematics", examTarget: "Foundation 6-10, SSC, One-Day" },
  { name: "Ved Prakash Bais", phone: "6393450386", email: "vedpbais2708@gmail.com", teachingSubject: "History", examTarget: "PGT, UGC NET" },
  { name: "Yash Prajapati", phone: "7267932323", email: "yash.praj2000@gmail.com", teachingSubject: "Computer", examTarget: "ADDA247 ITI" },
  { name: "Sonam Kumari", phone: "6200384801", email: "sonam620038@gmail.com", teachingSubject: "Geography and Polity", examTarget: "SSC" },
  { name: "Danish Hussain", phone: "8287752923", email: "danishhussain653@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC" },
  { name: "Aditya Kumar", phone: "9006762842", email: "vanijya.aditya@gmail.com", teachingSubject: "Accountancy", examTarget: "K-12, CA & CMA" },
  { name: "Dinesh Kumar Yadav", phone: "9161652812", email: "dky3805@gmail.com", teachingSubject: "Science", examTarget: "Railway" },
  { name: "Madhu Shakya", phone: "6397027680", email: "madhu.madhushakya@gmail.com", teachingSubject: "Mathematics", examTarget: "SSC CGL" },
  { name: "Shoaib Khan", phone: "9340981449", email: "ershoaib59@kgpian.iitkgp.ac.in", teachingSubject: "Mechanical Engineering", examTarget: "GATE, SSC JE" },
  { name: "Deepak Kumar Dubey", phone: "7838505185", email: "deepak7838505185@gmail.com", teachingSubject: "Current Affairs, Geography", examTarget: "UPPCS, UPSC" },
  { name: "Anil Kumar", phone: "8534000975", email: "anilku1094@gmail.com", teachingSubject: "Mathematics", examTarget: "SSC, Railway, Bank, State" },
  { name: "Neha Goel", phone: "8447186352", email: "nehagoel030@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC" },
  { name: "Kajal", phone: "8851126419", email: "k661kajal@gmail.com", teachingSubject: "CDP", examTarget: "Teaching Exams" },
  { name: "Tripti", phone: "8057635332", email: "triptimanjera8nov@gmail.com", teachingSubject: "Mathematics", examTarget: "Class 11-12" },
  { name: "Shubham Kumar Maurya", phone: "7704837523", email: "stmusk1221@gmail.com", teachingSubject: "Multi-subject", examTarget: "Academics" },
  { name: "Ashutosh Srivastava", phone: "7985216985", email: "ashu14june@gmail.com", teachingSubject: "Polity & Modern History", examTarget: "State PCS" },
  { name: "Shraddha Sharma", phone: "8840371565", email: "shraddhasharma8840@gmail.com", teachingSubject: "CDP", examTarget: "CTET" },
  { name: "Ashish Kumar Saxena", phone: "7080806134", email: "ashishsaxena.adda@gmail.com", teachingSubject: "Geography", examTarget: "Teaching Exam" },
  { name: "Akash Pandey", phone: "9140683075", email: "pandeyakash546@gmail.com", teachingSubject: "English & Social Science", examTarget: "Academics" },
  { name: "Priya Gupta", phone: "7704030689", email: "pgupta888@gmail.com", teachingSubject: "Biology (Botany & Zoology)", examTarget: "Academic Class 9-10" },
  { name: "Nitesh Kumar", phone: "9534065435", email: "niteshwrites09@gmail.com", teachingSubject: "English", examTarget: "SSC/Bank" },
  { name: "Astha Singh", phone: "7752825471", email: "asthasingh12210@gmail.com", teachingSubject: "History, Current Affairs", examTarget: "SSC" },
  { name: "Akansha Mishra", phone: "9616608950", email: "mishraakansha2204@gmail.com", teachingSubject: "Reasoning", examTarget: "Banking" },
  { name: "Tulsi Singh", phone: "9555741181", email: "kanttulsi03@gmail.com", teachingSubject: "Nursing Subjects", examTarget: "Nursing" },
  { name: "Vaishali Dixit", phone: "8299471880", email: "vaishaleedixit911@gmail.com", teachingSubject: "Current Affairs/IR", examTarget: "UPSC/UPPCS" },
  { name: "Hansraj Meena", phone: "7879451250", email: "hansraj7879451250@gmail.com", teachingSubject: "Maths/Reasoning", examTarget: "Railway/SSC/Bank" },
  { name: "Anshuman", phone: "9717249886", email: "anshuman.kumarr@gmail.com", teachingSubject: "Geography, SST", examTarget: "Teaching Exams, CTET/STET, UGC NET" },
  { name: "Damini Singh", phone: "8881034410", email: "daminijnp01@gmail.com", teachingSubject: "Reasoning", examTarget: "SSC" },
  { name: "Sumit", phone: "9068191757", email: "sumitmunjal63@gmail.com", teachingSubject: "Mathematics", examTarget: "Teaching Exams" },
  { name: "Rakesh Kumar Yadav", phone: "9807385434", email: "rakeshyadavme@gmail.com", teachingSubject: "TOM, RAC, HMT, ICE, MD, IE", examTarget: "Mechanical Engineering" },
  { name: "Akanksha Kumari", phone: "9472896045", email: "akankshakumari582003@gmail.com", teachingSubject: "Sociology", examTarget: "CUET UG/PG, Academics" },
  { name: "Rajni Devi", phone: "6393602973", email: "vermarajni03558@gmail.com", teachingSubject: "Hindi Vyakaran", examTarget: "Academic Class 10-12" },
  { name: "Rahul Upadhyay", phone: "6397251799", email: "rs9702761@gmail.com", teachingSubject: "Mathematics", examTarget: "Foundation (up to Class 10)" },
  { name: "Rishabh Raja", phone: "9305229840", email: "rishabhrajadj1234@gmail.com", teachingSubject: "GS, Polity", examTarget: "SSC" },
  { name: "Divaroopa Mishra", phone: "9557682236", email: "mishradiva2024@gmail.com", teachingSubject: "Computer", examTarget: "SSC, CUET, UGC" },
  { name: "Aniruddh Sharma", phone: "9305115362", email: "rahulpandit67023@gmail.com", teachingSubject: "Maths", examTarget: "Class 9-10" },
  { name: "Ansh Dham", phone: "9897021641", email: "anshdham04@gmail.com", teachingSubject: "Physics", examTarget: "JEE/NEET" },
  { name: "Rohit Yadav", phone: "9134062670", email: "rkumarsc163@gmail.com", teachingSubject: "Mathematics", examTarget: "Academic Class 9-10" },
  { name: "Deepak Kumar", phone: "9798882457", email: "deepakkumar01052005@gmail.com", teachingSubject: "Physics & Chemistry", examTarget: "Foundation" },
  { name: "Tezender Gulia", phone: "8696431618", email: "tezendergulia93@gmail.com", teachingSubject: "Political Science", examTarget: "CUET PG" },
  { name: "Anas Rasheed", phone: "9506480698", email: "rasheedanas515@gmail.com", teachingSubject: "Reasoning", examTarget: "Reasoning" },
  { name: "Anubhav Singh", phone: "8299338171", email: "001anubhavthakur0@gmail.com", teachingSubject: "History and Polity", examTarget: "SSC, Defence" },
  { name: "Mahendra Nagar", phone: "8770232537", email: "mahennagar11@gmail.com", teachingSubject: "Physics", examTarget: "11th 12th Board & NEET" },
  { name: "Shubham Pandey", phone: "6392683465", email: "pandeygsibbu@gmail.com", teachingSubject: "CDP & Social Studies", examTarget: "Teaching Exams" },
  { name: "Mohammad Shahnawaz", phone: "9634193607", email: "shahnawazmaulvi@gmail.com", teachingSubject: "Urdu, Arabic", examTarget: "CUET UG/PG, UGC NET, CTET" },
  { name: "Akanksha Ray", phone: "9937231838", email: "akanksharay03@gmail.com", teachingSubject: "Reasoning", examTarget: "Banking" },
  { name: "Prutha Saha", phone: "6305448345", email: "pruthasaha09@gmail.com", teachingSubject: "Biology", examTarget: "Class 9-12, NEET, SSC Science" },
  { name: "Dr. Vinodinee Dubey", phone: "7415012477", email: "vinodinee26@gmail.com", teachingSubject: "Zoology", examTarget: "NEET" },
  { name: "Shubham Kushwaha", phone: "9630700101", email: "shubhamkushwaha629@gmail.com", teachingSubject: "Sociology", examTarget: "UGC NET" },
  { name: "Swadeep Shrivastava", phone: "7999635417", email: "swadeepshri@gmail.com", teachingSubject: "Geography & MP State", examTarget: "MPPSC" },
  { name: "Shreya Trivedi", phone: "8004489477", email: "mishitri7071@gmail.com", teachingSubject: "Science", examTarget: "Teaching" },
  { name: "Rishika Mishra", phone: "9608842014", email: "mishra.rishika029@gmail.com", teachingSubject: "Business Studies", examTarget: "Class 11-12" },
  { name: "Surbhi", phone: "9953079307", email: "surbhijindal1311@gmail.com", teachingSubject: "Quantitative Aptitude", examTarget: "CUET UG/PG" },
  { name: "Anupama Singh", phone: "9540393168", email: "singhanupama517@gmail.com", teachingSubject: "Political Science", examTarget: "CUET" },
  { name: "Sufia Naz", phone: "8789446880", email: "hayatnaz222@gmail.com", teachingSubject: "Physics", examTarget: "Railway, SSC" },
  { name: "Pooja Agarwal", phone: "7878806140", email: "probankersinsights@gmail.com", teachingSubject: "Reasoning", examTarget: "Bank & Insurance" },
  { name: "Priyanka Verma", phone: "9518176133", email: "pv955929@gmail.com", teachingSubject: "Biology", examTarget: "CBSE Board, NEET" },
  { name: "Rupesh Kumar", phone: "7209324254", email: "rupeshkumar.adv23@gmail.com", teachingSubject: "Indian Polity & Constitution", examTarget: "UPSC/PCS (JPSC)" },
  { name: "Tanishq Shukla", phone: "7394838672", email: "tanishqshukla572@gmail.com", teachingSubject: "Biology", examTarget: "NEET" },
  { name: "Prachi Choudhary", phone: "8770914636", email: "cdeep1890@gmail.com", teachingSubject: "GK", examTarget: "SSC" },
  { name: "Radha Tamoli", phone: "7895093044", email: "radharawat0156@gmail.com", teachingSubject: "Polity", examTarget: "Class 9-12, B.A" },
  { name: "Sanchita Kumari", phone: "9572923483", email: "kumarisanchita67@gmail.com", teachingSubject: "General Awareness", examTarget: "Banking" },
  { name: "Gurinder Singh", phone: "7707995131", email: "gurindersingh2185@gmail.com", teachingSubject: "Mathematics", examTarget: "CUET UG" },
  { name: "Ripudaman Singh", phone: "9580229042", email: "ripukbc2018@gmail.com", teachingSubject: "Mathematics", examTarget: "SSC, Railway" },
  { name: "Rahul Raviraj", phone: "9386318074", email: "er.rahulraviraj@gmail.com", teachingSubject: "Mathematics", examTarget: "Academic Class 9-10" },
  { name: "Rohit Khatri", phone: "9555743915", email: "rohitkhatri0209@gmail.com", teachingSubject: "English", examTarget: "DSSSB, SSC" },
  { name: "Vatsal Bhardwaj", phone: "9928122841", email: "bharadwajvatsal@gmail.com", teachingSubject: "GS (Polity)", examTarget: "SSC" },
  { name: "Manjunath Bharadwaj", phone: "8880652666", email: "manjunathbharadwaj91@gmail.com", teachingSubject: "Maths, Chemistry, Physics", examTarget: "NEET, CET, JEE, Board" },
  { name: "Pramila Yadav", phone: "7419027079", email: "pramilayaduvanshi0@gmail.com", teachingSubject: "CDP", examTarget: "CTET/HTET/REET" },
  { name: "Himanshi", phone: "7988057414", email: "phalswal2509@gmail.com", teachingSubject: "Chemistry", examTarget: "11th, 12th, CUET, NEET" },
  { name: "Rajan", phone: "9213403071", email: "9213403071r@gmail.com", teachingSubject: "Sociology, Political Science", examTarget: "UPSC, PSC" },
  { name: "Poonam Tiwari", phone: "9004651427", email: "poonamtiwari3030@gmail.com", teachingSubject: "Hindi", examTarget: "Teaching (KVS PRT, TGT, UPTET), UPSI" },
  { name: "Neha Singh", phone: "8982464528", email: "singhnehaa478@gmail.com", teachingSubject: "GS & Current Affairs", examTarget: "SSC" },
  { name: "Swati Chauhan", phone: "8750024244", email: "vyasswati0811@gmail.com", teachingSubject: "Social Science", examTarget: "Class 6-10" },
  { name: "Shivam Singh", phone: "9621266246", email: "shivamchauhan0380@gmail.com", teachingSubject: "Geography", examTarget: "SSC, Railway" },
  { name: "Shivam Rishav", phone: "7088712709", email: "shivam.rishav1998@gmail.com", teachingSubject: "Current Affairs (PIB, RBI)", examTarget: "Banking, SSC, BPSC" },
  { name: "Ashish Kumar", phone: "8368703609", email: "ak527524@gmail.com", teachingSubject: "Mathematics", examTarget: "UP Board 9-10" },
  { name: "Vipin Yadav", phone: "8534854926", email: "vy607092@gmail.com", teachingSubject: "GS & Science", examTarget: "UPPSC, UPSC, SSC" },
  { name: "Rajesh Kumar Pal", phone: "7275968354", email: "rajeshpal2985@gmail.com", teachingSubject: "Political Science", examTarget: "UGC NET-JRF" },
  { name: "Himanshu Mishra", phone: "6386524141", email: "himanshusagar378@gmail.com", teachingSubject: "Quantitative Aptitude", examTarget: "SSC/Railway" },
  { name: "Harpreet Kaur", phone: "8278789216", email: "harpreetkaurpmkk@gmail.com", teachingSubject: "Mathematics", examTarget: "Academics" },
  { name: "Harshita Pathak", phone: "9369547481", email: "pathakchinki3@gmail.com", teachingSubject: "Science", examTarget: "10, 12, CUET" },
  { name: "Meenakshi Lohani", phone: "8077278361", email: "lohanimeenakshi@gmail.com", teachingSubject: "Polity & Governance", examTarget: "State PCS" },
  { name: "Tikesh Patel", phone: "7692822529", email: "tikesh961725@gmail.com", teachingSubject: "Biology (Zoology)", examTarget: "NEET" },
  { name: "Altaf Raja", phone: "6200100760", email: "kohifacto@gmail.com", teachingSubject: "Current Affairs, GK, Polity, Bihar Special", examTarget: "Competitive Exams" },
  { name: "Amit Kumar Verma", phone: "8577821838", email: "amitv9503@gmail.com", teachingSubject: "English Literature", examTarget: "UGC NET/SET/CUET" },
  { name: "Tamana Kumari", phone: "7701800536", email: "tamannakumari9911@gmail.com", teachingSubject: "CDP", examTarget: "CTET, UPTET, D.El.Ed" },
  { name: "Piyush Sanjay Jaiswal", phone: "7030332009", email: "jaiswalpiyush7030@gmail.com", teachingSubject: "Biology", examTarget: "Biology" },
  { name: "Anish Sinha", phone: "7828139367", email: "anishissinha@gmail.com", teachingSubject: "Science, Computer, CG GK", examTarget: "SSC/RRB/CGPSC" },
  { name: "Vikhyat Mishra", phone: "7408726445", email: "19vikh@gmail.com", teachingSubject: "English (Grammar)", examTarget: "Competitive Exams" },
  { name: "Manish Kumar", phone: "6388335466", email: "mnisk98@gmail.com", teachingSubject: "Thermodynamics & Applied", examTarget: "SSC JE, RRB JE, ALP" },
  { name: "Simran", phone: "8882461761", email: "themalikofficialy@gmail.com", teachingSubject: "Library Science", examTarget: "UGC NET, DSSSB" },
  { name: "Ranjan Kumar", phone: "9709752526", email: "ranjaan58@gmail.com", teachingSubject: "Maths", examTarget: "BPSC TRE, Bihar STET" },
  { name: "Akanksha", phone: "8528742590", email: "devnampriya767@gmail.com", teachingSubject: "Current Affairs", examTarget: "UPSC CSE" },
  { name: "Harsh Kumar", phone: "9758721304", email: "harshu790064@gmail.com", teachingSubject: "English", examTarget: "SSC" },
  { name: "Neha Khurana", phone: "7042550954", email: "contactneha30@gmail.com", teachingSubject: "Logical Reasoning", examTarget: "UGC NET (Paper I)" },
  { name: "Ishan Sharma", phone: "8871294239", email: "ishan891996sharma@gmail.com", teachingSubject: "Chemistry", examTarget: "Boards, JEE/NEET" },
];

async function emailExists(email: string): Promise<string | null> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: "fep-users",
      IndexName: "email-index",
      KeyConditionExpression: "email = :e",
      ExpressionAttributeValues: { ":e": email.toLowerCase().trim() },
      Limit: 1,
    })
  );
  return res.Items?.[0]?.userId as string ?? null;
}

async function main() {
  console.log(`🚀 Seeding June EduSkill cohort (${JUNE_EduSkill.length} entries, deduplicated)...\n`);
  const password = await bcrypt.hash("fep123", 10);
  let created = 0, updated = 0, skipped = 0;
  const seen = new Set<string>();

  for (const f of JUNE_EduSkill) {
    const email = f.email.toLowerCase().trim();
    if (seen.has(email)) { skipped++; continue; }
    seen.add(email);

    const existingId = await emailExists(email);
    if (existingId) {
      // Update cohort tag on existing user
      await ddb.send(new UpdateCommand({
        TableName: "fep-users",
        Key: { userId: existingId },
        UpdateExpression: "SET cohort = :c, teachingSubject = :ts, examTarget = :et",
        ExpressionAttributeValues: { ":c": "June EduSkill", ":ts": f.teachingSubject, ":et": f.examTarget },
      }));
      updated++;
    } else {
      await ddb.send(new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(),
          name: f.name,
          email,
          phone: f.phone,
          role: "eduskill_faculty",
          subjects: [],
          teachingSubject: f.teachingSubject,
          examTarget: f.examTarget,
          cohort: "June EduSkill",
          passwordHash: password,
          createdAt: new Date().toISOString(),
        },
      }));
      created++;
    }
  }

  console.log(`✓ Created: ${created} new accounts`);
  console.log(`✓ Updated: ${updated} existing (added June EduSkill tag)`);
  console.log(`✓ Skipped: ${skipped} duplicates\n`);
  console.log("Login: any email + password 'fep123'");
}

main().catch(e => { console.error("Seed failed:", e); process.exit(1); });
