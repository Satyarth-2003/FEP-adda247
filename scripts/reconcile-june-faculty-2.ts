import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
  { marshallOptions: { removeUndefinedValues: true } }
);

const rawText = `Rana Mrituanjay Singh 	ranamrityunjay2015@gmail.com
Mayank Kumar 	mayankpathak0098@gmail.com
Prem Raj 	prempipul7209@gmail.com
Alok gautam 	aggautam93@gmail.com
Sandeep kumar	sksandeepraj936@gmail.com
Lalit Yadav 	lalityadav377433@gmail.com
Vishesh Verma 	visheshverma2002real@gmail.com
Durga Tripathi 	Durgatripathi092@gmail.com
Parthavi Dhawan	parthavidhawan29@gmail.com
Piyush kumar singh 	pksraghuvanshi18@gmail.com
Gyanendra Tiwari 	Enlightengyan@gmail.com
Amresh Kumar Sinha 	asinhabgp@gmail.com
MITHUN KUMAR	mithunkumar46173@gmail.com
Shubham gupta 	guptashubham0093@gmail.com
Ram vibhor mishra	ramvibhor060@gmail.com
Abhishek Kumar 	abchauhan0802@gmail.com
SHASHI KUMAR SAH 	shashismo91@gmail.com
Sandeep Verma 	Sv3274821@gmail.com
Chandan Pandey	cpandey414@gmail.com
Tejus Soni 	tejussoni91@gmail.com
Shivangi Sonkar 	shivangi915sonkar@gmail.com
Brijesh Kumar 	brijeshsir2959@gmail.com
Anshu Kumar 	anshuking93043@gmail.com
Shubham Srivastava 	shubhamsrivastava0022@gmail.com
Uttam Singh 	raghavuttam2111@gmail.com
ADARSH BODANA	adarshbodana85@gmail.com
Anamika agrahari 	anamikaanamikaagrahari62038@gmail.com
Shivendra Singh 	shivendra9793500617@gmail.com
GANESH CHANDRA CHAURASIYA	bindassgcc@gmail.com
Deepak Sonu (Deepak Kumar)	sonud9125@gmail.com
Pooja Kumari 	poojakumari01201997@gmail.com
Numan Shahabuddin 	haanclasses@gmail.com
Divyanshu tiwari 	tiwaridivynshu@gmail.com
Sunny Rai	raisunny524@gmail.com
Saurabh Kumar Dwivedi	shubh29d@gmail.com
Suryakant Singh	drsurya2016@gmail.com
Sagar	sagarpatva1007@gmail.com
Raj kumar Raju 	16btag115@gmail.com
Namrata Mishra 	namratamishra232@gmail.com
Md sarfraj ali 	mdsarfrajali02@gmail.com
Anoop Patel 	ap2320575@gmail.com
Milan Kumar 	milankumar008@gmail.com
Vandana Singhal	vandanasinghal1811@gmail.com
Sambhu Kumar	sambhukumar971@gmail.com
Ravendra verma 	ravendraverma1995@gmail.com
SACHIN SRIVASTAVA 	sachinsrivastava1160@gmail.com
Devendra Singh 	nedevendra95@gmail.Com
Numan Shahabuddin 	haanclasses@gmail.com
Shivanand Yadav 	rajababushiva70@gmail.com
Ved Prakash Bais	vedpbais2708@gmail.com
Yash Prajapati	yash.praj2000@gmail.com
Sonam Kumari 	sonam620038@gmail.com
Danish Hussain	danishhussain653@gmail.com
Aditya Kumar 	vanijya.aditya@gmail.com
Dinesh kumar yadav 	dky3805@gmail.com
Madhu shakya	Madhu.madhushakya@gmail.com
Shoaib Khan 	ershoaib59@kgpian.iitkgp.ac.in
Deepak Kumar Dubey 	deepak7838505185@gmail.com
ANIL KUMAR 	anilku1094@gmail.com
Neha goel	nehagoel030@gmail.com
Kajal	k661kajal@gmail.com
Tripti 	triptimanjera8nov@gmail.com
Shubham Kumar maurya	stmusk1221@gmail.com
Ashutosh Srivastava 	ashu14june@gmail.com
Shraddha Sharma 	shraddhaSharma8840@gmail.com
Ashish kumar saxena 	ash
AKASH PANDEY	pandeyakash546@gmail.com
Priya gupta 	Pgupta888@gmail.com
NITESH KUMAR	niteshwrites09@gmail.com
Astha singh	asthasingh12210@gmail.com
Akansha mishra	mishraakansha2204@gmail.com
Tulsi Singh	kanttulsi03@gmail.com
Vaishali Dixit	vaishaleedixit911@gmail.com
Hansraj Meena 	hansraj7879451250@gmail.com
Anshuman	anshuman.kumarr@gmail.com
Damini Singh 	daminijnp01@gmail.com
Namrata Mishra 	namratamishra232@gmail.com
Sumit	sumitmunjal63@gmail.com
Rakesh Kumar Yadav	rakeshyadavme@gmail.com
Akanksha Kumari 	akankshakumari582003@gmail.com
Rajni Devi 	vermarajni03558@gmail.com
RAHUL UPADHYAY 	rs9702761@gmail.com
Rishabh raja	rishabhrajadj1234@gmail.com
Akanksha Kumari 	akankshakumari582003@gmail.com
Divaroopa Mishra	mishradiva2024@gmail.com
Aniruddh sharma 	rahulpandit67023@gmail.com
Ansh Dham	anshdham04@gmail.com
ROHIT YADAV 	rkumarsc163@gmail.com
Deepak Kumar 	deepakkumar01052005@gmail.com
Tezender Gulia 	tezendergulia93@gmail.com
Anas Rasheed	rasheedanas515@gmail.com
Anubhav singh	001anubhavthakur0@gmail.com
Mahendra Nagar 	mahennagar11@gmail.com
SONAM KUMARI	sonam620038@gmail.com
Shubham Pandey 	pandeygsibbu@gmail.com
Mohammad Shahnawaz 	shahnawazmaulvi@gmail.com
GANESH CHANDRA CHAURASIYA	bindassgcc@gmail.com
Anshuman	Anshuman 
Mahendra Nagar 	mahennagar11@gmail.com
Akanksha Ray 	akanksharay03@gmail.com
Prutha Saha 	pruthasaha09@gmail.com
Dr. Vinodinee Dubey 	vinodinee26@gmail.com
Shubham kushwaha 	shubhamkushwaha629@gmail.com
Swadeep Shrivastava 	swadeepshri@gmail.com
Shreya Trivedi 	mishitri7071@gmail.com
Rishika Mishra 	mishra.rishika029@gmail.com
Surbhi	surbhijindal1311@gmail.com
Anupama singh 	Singhanupama517@gmail.com
Sufia Naz 	hayatnaz222@gmail.com
POOJA AGARWAL	PROBANKERSINSIGHTS@GMAIL.COM
Priyanka Verma 	pv955929@gmail.com
Rupesh Kumar 	rupeshkumar.adv23@gmail.com
Tanishq Shukla 	tanishqshukla572@gmail.com
Prachi choudhary	Cdeep1890@gmail.com
Radha Tamoli 	radharawat0156@gmail.com
Sanchita Kumari 	kumarisanchita67@gmail.com
Gurinder Singh 	gurindersingh2185@gmail.com
RIPUDAMAN SINGH 	ripukbc2018@gmail.com
RAHUL RAVIRAJ	er.rahulraviraj@gmail.com
Rohit	rohitkhatri0209@gmail.com
RAHUL RAVIRAJ	er.rahulraviraj@gmail.com
Vatsal Bhardwaj	bharadwajvatsal@gmail.com
Manjunath Bharadwaj B S 	manjunathbharadwaj91@gmail.com
Prutha Saha 	pruthasaha09@gmail.com
PRAMILA YADAV	Pramilayaduvanshi0@gmail.com
Himanshi 	phalswal2509@gmail.com
Rajan	9213403071r@gmail.com
Poonam Tiwari	poonamtiwari3030@gmail.com
Neha Singh 	singhnehaa478@gmail.com
SWATI CHAUHAN 	Vyasswati0811@gmail.com 
Shubham kushwaha 	shubhamkushwaha629@gmail.com
Anshuman	anshuman.kumarr@gmail.com
Rakesh Kumar Yadav	rakeshyadavme@gmail.com
Shivam singh	Shivamchauhan0380@gmail.com
Shivam Rishav 	shivam.rishav1998@gmail.com
Ashish Kumar 	ak527524@gmail.com
Vipin Yadav 	vy607092@gmail.com
RAJESH KUMAR PAL	rajeshpal2985@gmail.com
Himanshu Mishra	himanshusagar378@gmail.com
Harpreet kaur 	harpreetkaurpmkk@gmail.com
Harshita pathak 	pathakchinki3@gmail.com
Meenakshi lohani 	lohanimeenakshi@gmail.com
Ved Prakash Bais 	vedpbais2708@gmail.com
Rishabh raja	rishabhrajadj1234@gmail.com
Tikesh Patel 	tikesh961725@gmail.com
Altaf Raja 	kohifacto@gmail.com
Namrata Mishra 	namratamishra232@gmail.com
Amit kumar Verma	amitv9503@gmail.com
Ved Prakash Bais 	vedpbais2708@gmail.com
Tamana Kumari 	tamannakumari9911@gmail.com
Piyush sanjay jaiswal	jaiswalpiyush7030@gmail.com
Anish sinha	anishissinha@gmail.com
Vikhyat Mishra 	19vikh@gmail.com
Rana Mrituanjay Singh 	ranamrityunjay2015@gmail.com
Akanksha Ray 	akanksharay03@gmail.com
Shubham Srivastava 	shubhamsrivastava0022@gmail.com
ANIL KUMAR 	anilku1094@gmail.com
Lalit Yadav 	lalityadav377433@gmail.com
MANISH KUMAR 	mnisk98@gmail.com
SIMRAN 	themalikofficialy@gmail.com
Rupesh Kumar	rupeshkumar.adv23@gmail.com
Ranjan kumar 	ranjaan58@gmail.com
Akanksha	Devnampriya767@gmail.com
Harsh Kumar 	harshu790064@gmail.com
Neha Khurana	contactneha30@gmail.com
Ishan Sharma	ishan891996sharma@gmail.com
Ashish kumar saxena 	ashish.surfer20@gmail.com
Zainab Fatima 	Zainabfatimaansari350@gmail.com
Nitika Mishra 	Nitikamishra441@gmail.com
Sandeep verma 	sv3274821@gmail.com
Devendra Singh 	nedevendra95@gmail.Com
Krishna Rajput 	kanhiyalodhi657@gmail.com
Ankit pal	palankit253@gmail.com
Sumedha Trivedi	trivedisumedha24@gmail.com
Neha goel	nehagoel030@gmail.com
Sujoy Modak 	sujoymodak58@gmail.com
Ravindra Singh Deval 	ravindradeval@gmail.com
Anshuman	anshuman.kumarr@gmail.com
Mrityunjay kumar Gupta 	believeornoton@gmail.com
Monika	monikadhankar1999@gmail.com
Chandra Prakash Gupta 	chandraprakashg535@gmail.com
Chandan Pandey	cpandey414@gmail.com
Ankit Pal	palankit253@gmail.com
CHANDAN PANDEY	cpandey414@gmail.com
Krishna Kumar Yadav 	kyadav42117@gmail.com
Krishna Kumar Yadav 	kyadav42117@gmail.com
Pushpendra Saini	pushpendrasaini13@gmail.com
Dheeraj Kharwar	dheerajkharwar141095@gmail.com`;

function cleanEmail(email: string): string {
  return email.toLowerCase().trim().replace(".con", ".com");
}

async function run() {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const targetEmails = new Set<string>();
  const emailToName = new Map<string, string>();

  for (const line of lines) {
    const parts = line.split(/\t+/);
    if (parts.length >= 2) {
      const email = cleanEmail(parts[1]);
      if (email !== "ash" && email !== "anshuman") {
        targetEmails.add(email);
        emailToName.set(email, parts[0].trim());
      }
    } else {
      const match = line.match(/^(.+?)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
      if (match) {
        const email = cleanEmail(match[2]);
        targetEmails.add(email);
        emailToName.set(email, match[1].trim());
      }
    }
  }

  // Scan fep-users
  const scan = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const dbUsers = scan.Items ?? [];
  const juneUsers = dbUsers.filter(u => u.cohort === "June EduSkill");

  console.log(`Unique Target Emails Count: ${targetEmails.size}`);
  console.log(`DB June Users: ${juneUsers.length}`);

  // Fuzzy match extra users
  const extraUsers = juneUsers.filter(u => {
    const email = cleanEmail(String(u.email));
    return !targetEmails.has(email);
  });

  console.log(`\nExtra June Users: ${extraUsers.length}`);
  for (const u of extraUsers) {
    const email = cleanEmail(String(u.email));
    // Let's see if any email in target list matches part of this email
    let potentialMatch = "";
    for (const tEmail of targetEmails.keys()) {
      if (tEmail.includes(email) || email.includes(tEmail) || tEmail.slice(0, 5) === email.slice(0, 5)) {
        potentialMatch += `[${tEmail} (${emailToName.get(tEmail)})] `;
      }
    }
    console.log(`  - Name: "${u.name}", Email: "${u.email}", ID: ${u.userId} => Potential target email: ${potentialMatch || "None"}`);
  }
}

run().catch(console.error);
