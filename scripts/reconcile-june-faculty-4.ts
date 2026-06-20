import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

const DRY_RUN = false; // Set to false to perform the actual changes

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

const rawText3 = `Rana Mrituanjay Singh 	ranamrityunjay2015@gmail.com
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
Rank 80 missing in source?
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

const rawInput = `Email1Rana Mrituanjay Singhranamrityunjay2015@gmail.com2Mayank Kumarmayankpathak0098@gmail.com3Prem Rajprempipul7209@gmail.com4Alok Gautamaggautam93@gmail.com5Sandeep Kumarsksandeepraj936@gmail.com6Lalit Yadavlalityadav377433@gmail.com7Vishesh Vermavisheshverma2002real@gmail.com8Durga TripathiDurgatripathi092@gmail.com9Parthavi Dhawanparthavidhawan29@gmail.com10Piyush Kumar Singhpksraghuvanshi18@gmail.com11Gyanendra TiwariEnlightengyan@gmail.com12Amresh Kumar Sinhaasinhabgp@gmail.com13Mithun Kumarmithunkumar46173@gmail.com14Shubham Guptaguptashubham0093@gmail.com15Ram Vibhor Mishraramvibhor060@gmail.com16Abhishek Kumarabchauhan0802@gmail.com17Shashi Kumar Sahshashismo91@gmail.com18Sandeep VermaSv3274821@gmail.com19Chandan Pandeycpandey414@gmail.com20Tejus Sonitejussoni91@gmail.com21Shivangi Sonkarshivangi915sonkar@gmail.com22Brijesh Kumarbrijeshsir2959@gmail.com23Anshu Kumaranshuking93043@gmail.com24Shubham Srivastavashubhamsrivastava0022@gmail.com25Uttam Singhraghavuttam2111@gmail.com26Adarsh Bodanaadarshbodana85@gmail.com27Anamika Agraharianamikaanamikaagrahari62038@gmail.com28Shivendra Singhshivendra9793500617@gmail.com29Ganesh Chandra Chaurasiyabindassgcc@gmail.com30Deepak Sonu (Deepak Kumar)sonud9125@gmail.com31Pooja Kumaripoojakumari01201997@gmail.com32Numan Shahabuddinhaanclasses@gmail.com33Divyanshu Tiwaritiwaridivynshu@gmail.com34Sunny Rairaisunny524@gmail.com35Saurabh Kumar Dwivedishubh29d@gmail.com36Suryakant Singhdrsurya2016@gmail.com37Sagarsagarpatva1007@gmail.com38Raj Kumar Raju16btag115@gmail.com39Namrata Mishranamratamishra232@gmail.com40Md Sarfraj Alimdsarfrajali02@gmail.com41Anoop Patelap2320575@gmail.com42Milan Kumarmilankumar008@gmail.com43Vandana Singhalvandanasinghal1811@gmail.com44Sambhu Kumarsambhukumar971@gmail.com45Ravendra Vermaravendraverma1995@gmail.com46Sachin Srivastavasachinsrivastava1160@gmail.com47Devendra Singhnedevendra95@gmail.Com48Shivanand Yadavrajababushiva70@gmail.com49Ved Prakash Baisvedpbais2708@gmail.com50Yash Prajapatiyash.praj2000@gmail.com51Sonam Kumarisonam620038@gmail.com52Danish Hussaindanishhussain653@gmail.com53Aditya Kumarvanijya.aditya@gmail.com54Dinesh Kumar Yadavdky3805@gmail.com55Madhu ShakyaMadhu.madhushakya@gmail.com56Shoaib Khanershoaib59@kgpian.iitkgp.ac.in57Deepak Kumar Dubeydeepak7838505185@gmail.com58Anil Kumaranilku1094@gmail.com59Neha Goelnehagoel030@gmail.com60Kajalk661kajal@gmail.com61Triptitriptimanjera8nov@gmail.com62Shubham Kumar Mauryastmusk1221@gmail.com63Ashutosh Srivastavaashu14june@gmail.com64Shraddha SharmashraddhaSharma8840@gmail.com65Ashish Kumar Saxenaash ⚠️ incomplete email66Akash Pandeypandeyakash546@gmail.com67Priya GuptaPgupta888@gmail.com68Nitesh Kumarniteshwrites09@gmail.com69Astha Singhasthasingh12210@gmail.com70Akansha Mishramishraakansha2204@gmail.com71Tulsi Singhkanttulsi03@gmail.com72Vaishali Dixitvaishaleedixit911@gmail.com73Hansraj Meenahansraj7879451250@gmail.com74Anshumananshuman.kumarr@gmail.com75Damini Singhdaminijnp01@gmail.com76Sumitsumitmunjal63@gmail.com77Rakesh Kumar Yadavrakeshyadavme@gmail.com78Akanksha Kumariakankshakumari582003@gmail.com79Rajni Devivermarajni03558@gmail.com80Rahul Upadhyayrs9702761@gmail.com81Rishabh Rajarishabhrajadj1234@gmail.com82Divaroopa Mishramishradiva2024@gmail.com83Aniruddh Sharmarahulpandit67023@gmail.com84Ansh Dhamanshdham04@gmail.com85Rohit Yadavrkumarsc163@gmail.com86Deepak Kumardeepakkumar01052005@gmail.com87Tezender Guliatezendergulia93@gmail.com88Anas Rasheedrasheedanas515@gmail.com89Anubhav Singh001anubhavthakur0@gmail.com90Mahendra Nagarmahennagar11@gmail.com91Shubham Pandeypandeygsibbu@gmail.com92Mohammad Shahnawazshahnawazmaulvi@gmail.com93AnshumanAnshuman ⚠️ invalid email (entered name instead of email)94Akanksha Rayakanksharay03@gmail.com95Prutha Sahapruthasaha09@gmail.com96Dr. Vinodinee Dubeyvinodinee26@gmail.com97Shubham Kushwahashubhamkushwaha629@gmail.com98Swadeep Shrivastavaswadeepshri@gmail.com99Shreya Trivedimishitri7071@gmail.com100Rishika Mishramishra.rishika029@gmail.com101Surbhisurbhijindal1311@gmail.com102Anupama SinghSinghanupama517@gmail.com103Sufia Nazhayatnaz222@gmail.com104Pooja AgarwalPROBANKERSINSIGHTS@GMAIL.COM105Priyanka Vermapv955929@gmail.com106Rupesh Kumarrupeshkumar.adv23@gmail.com107Tanishq Shuklatanishqshukla572@gmail.com108Prachi ChoudharyCdeep1890@gmail.com109Radha Tamoliradharawat0156@gmail.com110Sanchita Kumarikumarisanchita67@gmail.com111Gurinder Singhgurindersingh2185@gmail.com112Ripudaman Singhripukbc2018@gmail.com113Rahul Ravirajer.rahulraviraj@gmail.com114Rohitrohitkhatri0209@gmail.com115Vatsal Bhardwajbharadwajvatsal@gmail.com116Manjunath Bharadwaj B Smanjunathbharadwaj91@gmail.com117Pramila YadavPramilayaduvanshi0@gmail.com118Himanshiphalswal2509@gmail.com119Rajan9213403071r@gmail.com120Poonam Tiwaripoonamtiwari3030@gmail.com121Neha Singhsinghnehaa478@gmail.com122Swati ChauhanVyasswati0811@gmail.com123Shivam SinghShivamchauhan0380@gmail.com124Shivam Rishavshivam.rishav1998@gmail.com125Ashish Kumarak527524@gmail.com126Vipin Yadavvy607092@gmail.com127Rajesh Kumar Palrajeshpal2985@gmail.com128Himanshu Mishrahimanshusagar378@gmail.com129Harpreet Kaurharpreetkaurpmkk@gmail.com130Harshita Pathakpathakchinki3@gmail.com131Meenakshi Lohanilohanimeenakshi@gmail.com132Tikesh Pateltikesh961725@gmail.com133Altaf Rajakohifacto@gmail.com134Amit Kumar Vermaamitv9503@gmail.com135Tamana Kumaritamannakumari9911@gmail.com136Piyush Sanjay Jaiswaljaiswalpiyush7030@gmail.com137Anish Sinhaanishissinha@gmail.com138Vikhyat Mishra19vikh@gmail.com139Manish Kumarmnisk98@gmail.com140Simranthemalikofficialy@gmail.com141Ranjan Kumarranjaan58@gmail.com142AkankshaDevnampriya767@gmail.com143Harsh Kumarharshu790064@gmail.com144Neha Khuranacontactneha30@gmail.com145Ishan Sharmaishan891996sharma@gmail.com146Ashish Kumar Saxenaashish.surfer20@gmail.com147Zainab FatimaZainabfatimaansari350@gmail.com148Nitika MishraNitikamishra441@gmail.com149Krishna Rajputkanhiyalodhi657@gmail.com150Ankit Palpalankit253@gmail.com151Sumedha Triveditrivedisumedha24@gmail.com152Sujoy Modaksujoymodak58@gmail.com153Ravindra Singh Devalravindradeval@gmail.com154Mrityunjay Kumar Guptabelieveornoton@gmail.com155Monikamonikadhankar1999@gmail.com156Chandra Prakash Guptachandraprakashg535@gmail.com157Krishna Kumar Yadavkyadav42117@gmail.com158Pushpendra Sainipushpendrasaini13@gmail.com159Dheeraj Kharwardheerajkharwar141095@gmail.com`;

function cleanEmail(email: string): string {
  let e = email.toLowerCase().trim();
  if (e.endsWith(".con")) e = e.slice(0, -4) + ".com";
  e = e.replace("ershoiab59", "ershoaib59");
  e = e.replace("surbhi.jindal1311", "surbhijindal1311");
  e = e.replace("singhanupam517", "singhanupama517");
  e = e.replace("hayatnaaz222", "hayatnaz222");
  e = e.replace("manjunathbhardwaj91", "manjunathbharadwaj91");
  return e;
}

// Build a list of clean reference emails
const refEmails: string[] = [];
rawText3.split("\n").forEach(line => {
  const parts = line.split(/\t+/);
  if (parts.length >= 2) {
    const e = cleanEmail(parts[1]);
    if (e && e !== "ash" && e !== "anshuman") {
      refEmails.push(e);
    }
  } else {
    const match = line.match(/^(.+?)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
    if (match) {
      refEmails.push(cleanEmail(match[2]));
    }
  }
});

// Remove duplicates and sort by length descending to match longest email first
const uniqueRefEmails = Array.from(new Set(refEmails)).sort((a, b) => b.length - a.length);

function parseNumberedList(str: string) {
  let s = str.trim();
  if (s.startsWith("Email")) {
    s = s.slice(5).trim();
  }

  // Pre-split rank numbers
  const regex = /(\.com|\.in|\.con|\.org|\.net|⚠️\s*incomplete\s*email|⚠️\s*invalid\s*email\s*\(entered\s*name\s*instead\s*of\s*email\))\s*(\d+)/gi;
  s = s.replace(regex, "$1\n$2");

  const lines = s.split("\n").map(l => l.trim()).filter(Boolean);
  const parsed = [];

  for (const line of lines) {
    const matchRank = line.match(/^(\d+)(.*)/);
    if (!matchRank) {
      console.warn("Could not match rank on line:", line);
      continue;
    }
    const rank = Number(matchRank[1]);
    const rest = matchRank[2].trim();

    // Check if rest ends with a known email
    let matchedEmail = "";
    for (const ref of uniqueRefEmails) {
      if (rest.toLowerCase().endsWith(ref)) {
        matchedEmail = ref;
        break;
      }
    }

    if (matchedEmail) {
      const emailIdx = rest.toLowerCase().lastIndexOf(matchedEmail);
      const name = rest.slice(0, emailIdx).trim();
      parsed.push({ rank, name, email: matchedEmail });
    } else {
      if (rest.includes("⚠️")) {
        const nameMatch = rest.match(/^(.*?)(⚠️.*)$/);
        const name = nameMatch ? nameMatch[1].trim() : rest;
        const warning = nameMatch ? nameMatch[2].trim() : "warning";
        parsed.push({ rank, name, email: "", warning });
      } else {
        // Fallback to regex
        const emailMatch = rest.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) {
          const email = cleanEmail(emailMatch[1]);
          const name = rest.slice(0, rest.indexOf(emailMatch[1])).trim();
          parsed.push({ rank, name, email });
        } else {
          console.warn(`Could not extract email from: ${rank} - ${rest}`);
        }
      }
    }
  }

  return parsed;
}

async function run() {
  console.log(`Starting reconciliation. DRY_RUN = ${DRY_RUN}`);

  const parsed = parseNumberedList(rawInput).filter(x => x.email);
  console.log(`Successfully parsed ${parsed.length} valid target users.`);

  const targetEmails = new Set(parsed.map(x => x.email));
  const emailToCorrectName = new Map(parsed.map(x => [x.email, x.name]));

  // Fetch tables
  const scanUsers = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const dbUsers = scanUsers.Items ?? [];
  const scanVideos = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const dbVideos = scanVideos.Items ?? [];
  const scanRatings = await ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" }));
  const dbRatings = scanRatings.Items ?? [];

  // Group DB users by normalized email
  const dbUsersByNormalizedEmail = new Map<string, any[]>();
  for (const u of dbUsers) {
    const norm = cleanEmail(String(u.email));
    if (!dbUsersByNormalizedEmail.has(norm)) {
      dbUsersByNormalizedEmail.set(norm, []);
    }
    dbUsersByNormalizedEmail.get(norm)!.push(u);
  }

  const defaultPasswordHash = await bcrypt.hash("fep123", 10);

  // Keep track of the resolved user IDs for June cohort
  const resolvedJuneUserIds = new Set<string>();

  for (const target of parsed) {
    const email = target.email;
    const correctName = target.name;
    const matchedUsers = dbUsersByNormalizedEmail.get(email) ?? [];

    if (matchedUsers.length === 0) {
      // Create new user
      const newUserId = uuid();
      console.log(`[CREATE] Missing user: "${correctName}" (${email}) -> ID: ${newUserId}`);
      resolvedJuneUserIds.add(newUserId);

      if (!DRY_RUN) {
        await ddb.send(new PutCommand({
          TableName: "fep-users",
          Item: {
            userId: newUserId,
            name: correctName,
            email: email,
            role: "eduskill_faculty",
            cohort: "June EduSkill",
            createdAt: new Date().toISOString(),
            passwordHash: defaultPasswordHash
          }
        }));
      }
    } else {
      // Find the best user ID to keep (the one with the most activity)
      let goodUser = matchedUsers[0];
      let maxActivity = -1;
      
      const userActivities = matchedUsers.map(u => {
        // We must not touch or disturb march cohort users!
        if (u.cohort === "March EduSkill") {
          return { user: u, activityScore: -99999, vCount: 0, receivedRatings: 0, isMarch: true };
        }
        
        const vCount = dbVideos.filter(v => v.facultyId === u.userId).length;
        const rCount = dbRatings.filter(r => r.managerId === u.userId).length;
        const ownVideoIds = dbVideos.filter(v => v.facultyId === u.userId).map(v => v.videoId);
        const receivedRatings = dbRatings.filter(r => ownVideoIds.includes(r.videoId)).length;
        const activityScore = vCount + rCount + receivedRatings;
        return { user: u, activityScore, vCount, receivedRatings, isMarch: false };
      });

      for (const act of userActivities) {
        if (act.activityScore > maxActivity) {
          maxActivity = act.activityScore;
          goodUser = act.user;
        }
      }

      // If the selected user to keep is March, but there are other matches, try to avoid keeping March
      if (goodUser.cohort === "March EduSkill") {
        console.warn(`[WARNING] Best matched user for ${email} is March cohort. Skipping this record or handling carefully...`);
        continue;
      }

      console.log(`[KEEP] Resolving "${correctName}" (${email}). Keeping ID: ${goodUser.userId} (Current name: "${goodUser.name}", Cohort: "${goodUser.cohort}")`);
      resolvedJuneUserIds.add(goodUser.userId);

      // Update details for the kept user
      if (!DRY_RUN) {
        await ddb.send(new UpdateCommand({
          TableName: "fep-users",
          Key: { userId: goodUser.userId },
          UpdateExpression: "SET #name = :name, email = :email, cohort = :cohort, #role = :role",
          ExpressionAttributeNames: { "#name": "name", "#role": "role" },
          ExpressionAttributeValues: {
            ":name": correctName,
            ":email": email,
            ":cohort": "June EduSkill",
            ":role": "eduskill_faculty"
          }
        }));
      }

      // Merge other duplicate user IDs (excluding any March cohort users!)
      for (const act of userActivities) {
        if (act.user.userId === goodUser.userId) continue;
        if (act.isMarch) {
          console.log(`  [SKIP MERGE] Found March Cohort duplicate user: ${act.user.userId}. Leaving untouched.`);
          continue;
        }

        console.log(`  [MERGE] Deplicating ID: ${act.user.userId}. Migrating ${act.vCount} videos...`);
        
        // Migrate videos of duplicate user to the kept user ID
        const dupVideos = dbVideos.filter(v => v.facultyId === act.user.userId);
        for (const v of dupVideos) {
          console.log(`    Moving video: "${v.title}" (${v.videoId}) to kept ID: ${goodUser.userId}`);
          if (!DRY_RUN) {
            await ddb.send(new PutCommand({
              TableName: "fep-videos",
              Item: {
                ...v,
                facultyId: goodUser.userId,
                facultyName: correctName
              }
            }));
            await ddb.send(new DeleteCommand({
              TableName: "fep-videos",
              Key: {
                facultyId: act.user.userId,
                videoId: v.videoId
              }
            }));
          }
        }

        // Delete duplicate user
        if (!DRY_RUN) {
          await ddb.send(new DeleteCommand({
            TableName: "fep-users",
            Key: { userId: act.user.userId }
          }));
        }
      }

      // Update name on any existing videos for the kept user
      const goodUserVideos = dbVideos.filter(v => v.facultyId === goodUser.userId);
      for (const v of goodUserVideos) {
        if (v.facultyName !== correctName) {
          console.log(`  [VIDEO NAME UPDATE] Video "${v.title}" (${v.videoId}): "${v.facultyName}" -> "${correctName}"`);
          if (!DRY_RUN) {
            await ddb.send(new PutCommand({
              TableName: "fep-videos",
              Item: {
                ...v,
                facultyName: correctName
              }
            }));
          }
        }
      }
    }
  }

  // Set any users currently in "June EduSkill" cohort but not in target list to "Unassigned"
  const activeJuneUsers = dbUsers.filter(u => u.cohort === "June EduSkill");
  for (const u of activeJuneUsers) {
    const norm = cleanEmail(String(u.email));
    if (!targetEmails.has(norm)) {
      console.log(`[UNASSIGN] User "${u.name}" (${u.email}) is not in June target list. Moving cohort to "Unassigned".`);
      if (!DRY_RUN) {
        await ddb.send(new UpdateCommand({
          TableName: "fep-users",
          Key: { userId: u.userId },
          UpdateExpression: "SET cohort = :cohort",
          ExpressionAttributeValues: { ":cohort": "Unassigned" }
        }));
      }
    }
  }

  console.log("\nReconciliation dry run / execution complete.");
}

run().catch(console.error);
