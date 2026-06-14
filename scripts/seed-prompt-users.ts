import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

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

const RAW_PROMPT_DATA = `Rajan	9213403071	9213403071r@gmail.com
Danish 	8287752923	danishhussain653@gmail.com
Ram vibhor Mishra	9559984830	ramvibhor060@gmail.com
Madhu Shakya	6397027680	Madhu.madhushakya@gmail.com
Sanchita Kumari	9572923483	kumarisanchita67@gmail.com
Anu Malik	7060958024	anujaatmalik@gmail.com
Saurabh 	7007424399	shubh29d@gmail.com
Deepak Kumar	7700820385	sonud9125@gmail.com
Sumit 	9068191715	sumitmunjal63@gmail.com
Ruchi khare	7388964383	ruchikhare300@gmail.com
Anish	7828139367	anishissinha@gmail.com
Kajal 	8851126419	k661kajal@gmail.com
Akanksha ray	9937231838	akanksharay03@gmail.com
Abhay pratap singh	8305453702	abhay.sengar10@gmail.com
Milan	8447354135	milankumar008@gmail.com
Vishesh	8957885514	visheshverma2002real@gmail.com
Shubham Gupta 	8077170988	guptashubham0093@gmail.com
Neha Goel	8447186352	nehagoel030@gmail.com
Hemant chauhan	9450174205	hemantchauhan578@gmail.com
Bimla Kumari	8440831840	bk6321776@gmail.com
Manish kumar	6388335466	mnisk98@gmail.com
Tezender Gulia	8696431618	tezendergulia93@gmail.com
Ashutosh Srivastava	7985216985	ashu14june@gmail.com
Gurinder	7707995131	Gurindersingh2185@gmail.com
Vivek 	8115870900	yvivek.1211@gmail.com
Dr. Tek Chand Gurjar	8385950011	drtcgurjar@gmail.com
Neha Singh	8982464528	singhnehaa478@gmail.com
Ripudaman Singh	9580229042	ripukbc2018@gmail.com
Dr. Vinodinee Dubey	7215012477	vinodinee26@gmail.com
Anil kumar	8534000975	anilku1094@gmail.com
Sujoy Modhak	8016286777	sujoymodak58@gmail.com
Rahul sharma	8595593580	rahulsharma74187@gmail.com
Prutha Saha	6305448345	pruthasaha09@gmail.com
Pramila yadav	7419027079	pramilayaduvanshi@gmail.com
Priyanka nagar	9354986742	gujjarumang959@gmail.com
Shreya Trivedi	8004489477	mishitri7071@gmail.com
Pandey Sudhindra Udaybhan	9970159516	pandeysudhindraudaybhan@gmail.com
Rupesh Kumar	7209324524	rupeshkumar.adv23@gmail.com
Akanksha Kumari 	9472896045	akankshakumari582003@gmail.com
Rishabh raja	9305229840	rishabhrajadj1234@gmail.com
Alok Gautam	6306213359	aggautam93@gmail.com
Astha singh	70685552113	meenudevi8299@gmail.com
Abhay kumar singh	7593844172	abhaysingh21021995@gmail.com
Sufia naaz	UTR-299426573045	hayatnaaz222@gmail.com
Abhishek kumar	8506014748	abchauhan0802@gmail.com
Surbhi	9953079307	surbhi.jindal1311@gmail.com
Jitendra Yadav	9161002168	yjitendra5797@gmail.com
Shubham pandey	6392683465	pandeygsibbu@gmail.com
 Rajni Devi	6393602973	vermarajni03558@gmail.com
Ravendra Verma	8878581672	ravendraverma1995@gmail.com
Raj kumar raju	9065965757	16btag115@gmail.com
Mayank Kumar	9140582792	mayankpathak0098@gmail.com
Sagar 	7828549239	sagarpatva1007@gmail.com
Uttam singh	9758580899	raghavuttam2111@gmail.com
Chhaya kumari	7070073837	chhayacpr251299@gmail.com
Shoiab khan	8109116994	ershoiab59@kgpian.iitkgp.ac.in
Krushna Rajput	9761055810	kanhiyalodhi657@gmail.com
Neha khurana	7042550954	contactneha30@gmail.com
Pooja kumari	9818915043	poojakumari01201997@gmail.com
Rana Mrituanjay Singh	9140965097	ranamrityunjay2015@gmail.com
Sumedha Trivedi	9457027231	trivedisumedha24@gmail.com
Sachin Srivastav	8299016930	sachinsrivastava1160@gmail.com
Prakash Pratap Giri	8176013261	prakashpratap0@gmail.com
Sandeep Verma 	9162876007	sv3274821@gmail.com
Damini Singh	8881034410	daminijnp01@gmail.com
Tulsi Singh	9555751181	kanttulsi03@gmail.com
Harpreet kaur	8278789216	harpreetkaurpmkk@gmail.com
Tikesh Patel	7692822529	tikesh961725@gmail.com
Ravindra Singh	8739983647	ravindradeval@gmail.com
Poonam Tiwari	9004651427	poonamtiwari3030@gmail.com
Vipin Yadav	8534854926	vy607092@gmail.com
Manjunath bhardwaj	8880652666	manjunathbhardwaj91@gmail.com
Ansh Dham	9897021641	anshdham04@gmail.com
Shubham Srivastava	6306322361	shubhamsrivastava0022@gmail.com
Anupama Chandel	9540393168	singhanupam517@gmail.com
Deepak 	7838505185	deepak7838505185@gmail.com
Trikesh 	7692822529	tikesh961725@gmail.com
Shivam Tiwari	7898883308	educatorshivam1@gmail.com
Shivendra Singh	9793500617	Shivendra9793500617@gmail.com
Priya gupta	7704030689	Pgupta888@gmail.com
Lalit Yadav	7668750482	lalityadav377433@gmail.com
Altaf Raja	6200100760	kohifacto@gmail.com
Ankit Pal	9250202065	palankit253@gmail.com
Priyanka verma	9518176133	pv955929@gmail.com
Anshuman	9717249886	anshuman.kumarr@gmail.com
Tamana Kumari	7701800536	tamannakumari9911@gmail.com
Radha Tamoli	9557673044	radharawat0156@gmail.com
Shraddha Sharma	8840371565	shraddhasharma8840@gmail.com
Devendra Singh	9559474329	nedevendra95@gmail.Com
 Amit kumar Verma	8577821838	 amitv9503@gmail.com
Ansh Dham	9897021641	anshdham04@gmail.com
Zainab Fatima	9569434770	zainabfatimaansari350@gmail.com
Ashish kumar saxena	7080806134	ashish.surfer20@gmail.com
Namrata Mishra	8917088384	namratamishra232@gmail.com
Gyanendra Tiwari	9289597892	Enlightengyan@gmail.com
Tripti Manjera	8057635332	triptimanjera8nov@gmail.com
Aditya Kumar	9006762842	vanijya.aditya@gmail.com
Vaishali dixit	8299471880	vaishalidixit618@gmail.com
Anoop Patel	6390458593	ap2320575@gmail.com
Vatsal Bhardwaj	9928122841	bharadwajvatsal@gmail.com
Shivangi Sonkar	7985334252	shivangi915sonkar@gmail.com
Nitin Chakravarti	9305006552	nitintenderone@gmail.com
Sunny Rai	9939715929	raisunny524@gmail.com
Dinesh kumar yadav	9616519928	dky3805@gmail.com
Megha yadav	7500020828	yadavmegha424@gmail.com
Ved prakash bais.	6393450386	vedpbais2708@gmail.com
Kuntal Ashok	7357499470	kuntalashok2001@gmail.com
Jogendra singh	8949619095	jogendraamarsinghadj2410@gmail.com
Abhay Singh	7593844172	abhaysingh21021995@gmail.com
Pooja	9068875463	Mmanvichawda@gmail.com
Sachin Srivastava	8299016930	rathodmanisha336@gmail.com
Pooja Agarwal	7878806140	probankersinsights@gmail.com
Adarsh Jain	8302452605	adarshbodana85@gmail.com
Numam Shahabuddin	9235835166	haanclasses@gmail.com
Vandana Singhal	6398214814	vandanasinghal1811@gmail.com
Chandan Pandey	9628931110	cpandey414@gmail.com
Suryakant Singh 	9452792871	drsurya2016@gmail.com
Pooja rani	9068875463	mmanvichawda@gmail.com
Amir Khan	7408510834	aamirkhan9731@gmail.com
Divyanshu Trivedi	9173470937	tiwaridivynshu@gmail.com
Yash Prajapati	7267932323	yash.praj2000@gmail.con
Manisha Rathod	9004401809	rathodmanisha336@gmail.com
Sandeep Kumar 	7011329909	 sksandeepraj936@gmail.com
Shashi Kumar Sah	9122634241	shashismo91@gmail.com
Shivanand Yadav	9795224657	rajababushiva70@gmail.com
Brijesh Chaudhary	9235193962	 brijeshsir2959@gmail.com
Amresh Kumar Sinha	6202246044	asinhabgp@gmail.com
Harshita pathak	9369547481	pathakchinki3@gmail.com
Hansraj Meena	7879451250	Hansraj7879451250@gmail.com
 Shivam Rishav	7088712709	shivam.rishav1998@gmail.com
Sambhu Kumar	8292522520	sambhukumar971@gmail.com
Anamika Agrahari 	9140792851	anamikaanamikaagrahari62038@gmail.com
Pushpendra Saini	7891981055	pushpendrasaini13@gmail.com
Anas Rasheed	9506480698	rasheedanas515@gmail.com
Rohit Yadav	9134062670	rkumarsc163@gmail.com
Nitesh Kumar	9534065435	niteshwrites09@gmail.com
Prachi 	8770914636	cdeep1890@gmail.com
Anirudh Sharma	9305115362	rahulpandit67023@gmail.com
Rohit khatra	9555743915	rohitkhatri0209@gmail.com
Himanshi	7988057414	phalswal2509@gmail.com
Himanshu Srivastava	6390296033	himkuch86@gmail.com
Prem raj	8709131540	Prempipul7209@gmail.com
Sonam Kumari	6200384801	sonam620038@gmail.com
Rahul Yadav	9598932803	 yadavrahul72528@gmail.com
Akanksha 	8528742590	devnampriya767@gmail.com
Juhi	8745034635	juhijrf1996@gmail.com
Monika Dhankar	8929254598	monikadhankar1999@gmail.com
Mritunjay kumar Gupta	9313219277	believeornoton@gmail.com
Swati Chauhan	8750024244	Vyasswati0811@gmail.com
Nitika Mishra	8955962723	nitikamishra441@gmail.com
Garima Srivastava	7355054986	srivastavagarima678@gmail.com
Tejus Soni.	9587280859	tejussoni91@gmail.com
Anubhav Singh	8299338171	001anubhavthakur0@gmail.com
Chandra Prakash Gupta	9129645707	chandraprakashg535@gmail.com
Durga Tripathi	7974585746	durgatripathi092@gmail.com
Mohammad Shahnawaz	9634193607	shahnawazmaulvi@gmail.com
Rahul Upadhyay	6397251799	rs9702761@gmail.com
Akanksha mishra	9616608950	mishraakansha2204@gmail.com
Akash Pandey	9140683075	pandeyakash546@gmail.com
Ganesh Chandra Chaurasiya	8787293330	bindassgcc@gmail.com
Rakesh Kumar Yadav	9807385434	rakeshyadavme@gmail.com
Md sarfraj ali	9631928426	mdsarfrajali02@gmail.com
Ishan sharma	8871294239	ishan891996sharma@gmail.com
Swadeep Shrivastava	7999635417	 swadeepshri@gmail.com
Rishika Mishra 	9608842014	mishra.rishika029@gmail.com
Divaroopa mishra 	9557682236	mishradiva2024@gmail.com
Dheeraj Kharwar	8928764486	Dheerajkharwar141095@gmail.com
Rahul Raviraj	9386318074	er.rahulraviraj@gmail.com
piyush kumar singh	7985114398	pksraghuvanshi18@gmail.com
Vikhyat Mishra.	7408726445	19vikh@gmail.com
Mahendra Nagar	8770232537	mahennagar11@gmail.com
Simran	8882461761	themalikofficialy@gmail.com
Himanshu mishra	6386524141	himanshusagar378@gmail.com
Harsh kumar	9758721304	harshu790064@gmail.com
Meenakshi lohani	8077278361	lohanimeenakshi@gmail.com
Anshu kumar 	9304385258	anshuking93043@gmail.com
Shubham Kushwaha 	9630600101	shubhamkushwaha629@gmail.com
Mithun Kumar	9598946244	mithunkumar46173@gmail.com
Shubham Kumar Maurya	6307964551	stmusk1221@gmail.com
Piyush Jaiswal	7030332009	jaiswalpiyush7030@gmail.com
Tanishq Shukla	7394838672	tanishqshukla572@gmail.com
Sheetal sharma	9058458790	kmsheetal118@gmail.com
Parthavi Dhawan	8178887646	parthavidhawan29@gmail.com
Sushant Kumar	7632870300	sushantkumar3003@gmail.com
Krishna Yadav 	7903489984	kyadav42117@gmail.com`;

async function seed() {
  const lines = RAW_PROMPT_DATA.trim().split("\n");
  
  const scan = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const existingEmails = new Set(
    (scan.Items ?? []).map((u) => String(u.email).toLowerCase().trim())
  );
  
  const passwordHash = await bcrypt.hash("fep123", 10);
  let seeded = 0;
  
  for (const line of lines) {
    const parts = line.split("\t").map(p => p.trim());
    if (parts.length < 3) continue;
    
    const name = parts[0];
    const phone = parts[1];
    const email = parts[2].toLowerCase();
    
    if (existingEmails.has(email)) {
      continue;
    }
    
    console.log(`Seeding missing prompt user: ${name} (${email})`);
    
    await ddb.send(
      new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(),
          name,
          email,
          phone,
          role: "fep_faculty",
          subjects: ["foundation"], // Default vertical
          teachingSubject: "General Studies",
          examTarget: "SSC",
          cohort: "June FEP",
          passwordHash,
          createdAt: new Date().toISOString(),
        },
      })
    );
    seeded++;
  }
  
  console.log(`Successfully seeded ${seeded} users from prompt data!`);
}

seed().catch(console.error);
