import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { refineSubjectAndVertical } from "./sync-subjects-local";

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

const RAW_DATA = `Name 	Contact Number	Email Id 	Subject You Want To Teach ?	Vertical You Want To Teach ?
Rana Mrituanjay Singh 	9935177381	ranamrityunjay2015@gmail.com	History 	SSC
Mayank Kumar 	9140582792	mayankpathak0098@gmail.com	Maths	Foundation
Prem Raj 	8709131540	prempipul7209@gmail.com	Biology 	Neet
Alok gautam 	6306213359	aggautam93@gmail.com	English 	Foundation 
Sandeep kumar	7011329909	sksandeepraj936@gmail.com	Reasoning 	SSC
Lalit Yadav 	7668750481	lalityadav377433@gmail.com	Economy 	Ssc
Vishesh Verma 	8957885514	visheshverma2002real@gmail.com	Maths 	Foundation
Durga Tripathi 	7974585746	Durgatripathi092@gmail.com	Biology 	Teaching 
Parthavi Dhawan	8178887646	parthavidhawan29@gmail.com	Mathematics 	Foundation 
Piyush kumar singh 	7985114398	pksraghuvanshi18@gmail.com	Gs	Upsc 
Gyanendra Tiwari 	9289597892	Enlightengyan@gmail.com	Polity 	Upsc/state pcs
Amresh Kumar Sinha 	6202246044	asinhabgp@gmail.com	History and bihar special 	Bpsc,ssc
MITHUN KUMAR	9598946244	mithunkumar46173@gmail.com	Geography 	Geography 
Shubham gupta 	8077170988	guptashubham0093@gmail.com	Maths	SSC
Ram vibhor mishra	9559984830	ramvibhor060@gmail.com	History	UGC
Abhishek Kumar 	8506014748	abchauhan0802@gmail.com	Quantitative Aptitude 	Banking 
SHASHI KUMAR SAH 	9122634241	shashismo91@gmail.com	Maths	SSC
Sandeep Verma 	9162876007	Sv3274821@gmail.com	Political science 	K12
Chandan Pandey	9628931110	cpandey414@gmail.com	Geography	UGC - NET 
Tejus Soni 	9587280859	tejussoni91@gmail.com	Current Affairs	Civil Services Exams
Shivangi Sonkar 	7985334252	shivangi915sonkar@gmail.com	Biology 	K12
Brijesh Kumar 	9235193962	brijeshsir2959@gmail.com	Geography 	UPPSC
Anshu Kumar 	9304385258	anshuking93043@gmail.com	Maths	K12
Shubham Srivastava 	6306322361	shubhamsrivastava0022@gmail.com	Maths	Foundation
Uttam Singh 	9758580899	raghavuttam2111@gmail.com	GS	SSC
ADARSH BODANA	8302452605	adarshbodana85@gmail.com	Geography	UGC NET 
Anamika agrahari 	9140792851	anamikaanamikaagrahari62038@gmail.com	History 	UPSSSC / PCS
Shivendra Singh 	9793500617	shivendra9793500617@gmail.com	Maths 	SSC
GANESH CHANDRA CHAURASIYA	8787293330	bindassgcc@gmail.com	Biology	SSC
Deepak Sonu (Deepak Kumar)	7700820385	sonud9125@gmail.com	Maths 	SSC
Pooja Kumari 	9818915043	poojakumari01201997@gmail.com	English 	Foundation
Numan Shahabuddin 	9235835166	haanclasses@gmail.com	Maths	Foundation
Divyanshu tiwari 	9173470937	tiwaridivynshu@gmail.com	Reasoning 	SSC
Sunny Rai	9939715929	raisunny524@gmail.com	Geography 	SSC
Saurabh Kumar Dwivedi	7007424399	shubh29d@gmail.com	Maths	Teaching
Suryakant Singh	9452792871	drsurya2016@gmail.com	Biology	K12
Sagar	7828549239	sagarpatva1007@gmail.com	Zoology and botany	K12
Raj kumar Raju 	9065965757	16btag115@gmail.com	Biology 	Foundation 
Namrata Mishra 	8917088384	namratamishra232@gmail.com	Political Science/Civics	CUET PG
Md sarfraj ali 	9631928426	mdsarfrajali02@gmail.com	Geography 	K12
Anoop Patel 	7618898781	ap2320575@gmail.com	History 	Teaching
Milan Kumar 	8447354135	milankumar008@gmail.com	Political science, History Geography and Current Affairs 	K12
Vandana Singhal	6398214814	vandanasinghal1811@gmail.com	Maths	Foundation
Sambhu Kumar	8292522520	sambhukumar971@gmail.com	Maths	Foundation
Ravendra verma 	7974402952	ravendraverma1995@gmail.com	Building material & Construction 	Engineering 
SACHIN SRIVASTAVA 	8299016930	sachinsrivastava1160@gmail.com	History 	Foundation 
Devendra Singh 	9559474329	nedevendra95@gmail.Com	Chemistry 	Foundation +k12
Numan Shahabuddin 	9235835166	haanclasses@gmail.com	Maths	foundation
Shivanand Yadav 	9795224657	rajababushiva70@gmail.com	Maths 	 Foundation ,SSC ,  Teaching 
Subject you want to teach ?	Vertical you want to teach ?	Email Id 	Contact Number	Name
CDP	Teaching	anujaatmalik@gmail.com	7060958024	Anu Malik
CDP/Psychology	Teaching	ruchikhare300@gmail.com	7388964383	Ruchi khare
Maths	Banking	abhay.sengar10@gmail.com	8305453702	Abhay pratap singh
Physics	NEET	hemantchauhan578@gmail.com	9450174205	Hemant chauhan
Hindi	Teaching	bk6321776@gmail.com	8440831840	Bimla Kumari
History/Polity	UPSC/PCS	yvivek.1211@gmail.com	8115870900	Vivek 
Geography	CUET/UGC	drtcgurjar@gmail.com	8385950011	Dr. Tek Chand Gurjar
Maths	Banking	gujjarumang959@gmail.com	9354986742	Priyanka nagar
Biology	NEET	daminijnp01@gmail.com	8881034410	Damini Singh
Mathematics	Teaching	rathodmanisha336@gmail.com	8299016930	Sachin Srivastava
Chemistry	NEET	nedevendra95@gmail.Com	9559474329	Devendra Singh
English	UGC-NET	amitv9503@gmail.com	8577821838	 Amit kumar Verma
Psychology/CDP	Teaching	zainabfatimaansari350@gmail.com	9569434770	Zainab Fatima
Geography	Teaching	ashish.surfer20@gmail.com	7080806134	Ashish kumar saxena
Political Science	UGC-NET	namratamishra232@gmail.com	8917088384	Namrata Mishra
Mathematics	K12	triptimanjera8nov@gmail.com	8057635332	Tripti Manjera
Accountancy	CUET	vanijya.aditya@gmail.com	9006762842	Aditya Kumar
Current Affairs	UPSC	vaishalidixit618@gmail.com	8299471880	Vaishali dixit
History	Teaching	ap2320575@gmail.com	6390458593	Anoop Patel
GS(Polity)	SSC	bharadwajvatsal@gmail.com	9928122841	Vatsal Bhardwaj
Biology	K12	shivangi915sonkar@gmail.com	7985334252	Shivangi Sonkar
English	Banking	nitintenderone@gmail.com	9305006552	Nitin Chakravarti
Geography	SSC	raisunny524@gmail.com	9939715929	Sunny Rai
Science	SSC	dky3805@gmail.com	9616519928	Dinesh kumar yadav
Biology	NEET	yadavmegha424@gmail.com	7500020828	Megha yadav
History	UGC-NET	vedpbais2708@gmail.com	6393450386	Ved prakash bais.
History/Polity	UGC-NET	kuntalashok2001@gmail.com	7357499470	Kuntal Ashok
Mathematics	Teaching	jogendraamarsinghadj2410@gmail.com	8949619095	Jogendra singh
History/Polity	UPSC/PCS	abhaysingh21021995@gmail.com	7593844172	Abhay Singh
General Studies	SSC	Mmanvichawda@gmail.com	9068875463	Pooja
Reasoning	Banking	probankersinsights@gmail.com	7878806140	Pooja Agarwal
Geography	UGC-NET	adarshbodana85@gmail.com	8302452605	Adarsh Jain
Mathematics	Foundation	haanclasses@gmail.com	9235835166	Numam Shahabuddin
Mathematics	Foundation	vandanasinghal1811@gmail.com	6398214814	Vandana Singhal
Geography	UGC-NET	cpandey414@gmail.com	9628931110	Chandan Pandey
Biology	K12	drsurya2016@gmail.com	9452792871	Suryakant Singh 
General Studies	SSC	mmanvichawda@gmail.com	9068875463	Pooja rani
Mathematics	Banking	aamirkhan9731@gmail.com	7408510834	Amir Khan
Reasoning	SSC	tiwaridivynshu@gmail.com	9173470937	Divyanshu Trivedi
Computer	Tech	yash.praj2000@gmail.con	7267932323	Yash Prajapati
Mathematics	Teaching	rathodmanisha336@gmail.com	9004401809	Manisha Rathod
Reasoning	SSC	sksandeepraj936@gmail.com	7011329909	Sandeep Kumar 
Mathematics	SSC	shashismo91@gmail.com	9122634241	Shashi Kumar Sah
Mathematics	Teaching	rajababushiva70@gmail.com	9795224657	Shivanand Yadav
Geography	Teaching	brijeshsir2959@gmail.com	9235193962	Brijesh Chaudhary
History/Polity	UPSC/PCS	asinhabgp@gmail.com	6202246044	Amresh Kumar Sinha
Science	Foundation	pathakchinki3@gmail.com	9369547481	Harshita pathak
Mathematics	SSC	Hansraj7879451250@gmail.com	7879451250	Hansraj Meena
Current Affairs	Banking	shivam.rishav1998@gmail.com	7088712709	 Shivam Rishav
Mathematics	Foundation	sambhukumar971@gmail.com	8292522520	Sambhu Kumar
History	UPSC/PCS	anamikaanamikaagrahari62038@gmail.com	9140792851	Anamika Agrahari 
Biology	NEET	pushpendrasaini13@gmail.com	7891981055	Pushpendra Saini
Reasoning	SSC	rasheedanas515@gmail.com	9506480698	Anas Rasheed
Mathematics	Foundation	rkumarsc163@gmail.com	9134062670	Rohit Yadav
English	SSC	niteshwrites09@gmail.com	9534065435	Nitesh Kumar
GK	SSC	cdeep1890@gmail.com	8770914636	Prachi 
Mathematics	Foundation	rahulpandit67023@gmail.com	9305115362	Anirudh Sharma
English	SSC	rohitkhatri0209@gmail.com	9555743915	Rohit khatra
Chemistry	NEET	phalswal2509@gmail.com	7988057414	Himanshi
GK	SSC	himkuch86@gmail.com	6390296033	Himanshu Srivastava
Biology	NEET	Prempipul7209@gmail.com	8709131540	Prem raj
Geography	SSC	sonam620038@gmail.com	6200384801	Sonam Kumari
Mathematics	Teaching	yadavrahul72528@gmail.com	9598932803	Rahul Yadav
Current Affairs	UPSC	devnampriya767@gmail.com	8528742590	Akanksha 
Economics	UGC-NET	juhijrf1996@gmail.com	8745034635	Juhi
Mathematics	Banking	monikadhankar1999@gmail.com	8929254598	Monika Dhankar
Geography	UPSC/PCS	believeornoton@gmail.com	9313219277	Mritunjay kumar Gupta
Social Science	Foundation	Vyasswati0811@gmail.com	8750024244	Swati Chauhan
Humanities	Foundation	nitikamishra441@gmail.com	8955962723	Nitika Mishra
History/Polity	UPSC/PCS	srivastavagarima678@gmail.com	7355054986	Garima Srivastava
Current Affairs	UPSC/PCS	tejussoni91@gmail.com	9587280859	Tejus Soni.
History/Polity	SSC	001anubhavthakur0@gmail.com	8299338171	Anubhav Singh
GK/GS	UPSC/PCS	chandraprakashg535@gmail.com	9129645707	Chandra Prakash Gupta
Biology	Teaching	durgatripathi092@gmail.com	7974585746	Durga Tripathi
Urdu/Arabic	K12	shahnawazmaulvi@gmail.com	9634193607	Mohammad Shahnawaz
Mathematics	Foundation	rs9702761@gmail.com	6397251799	Rahul Upadhyay
Reasoning	Banking	mishraakansha2204@gmail.com	9616608950	Akanksha mishra
English	Foundation	pandeyakash546@gmail.com	9140683075	Akash Pandey
Biology	Foundation	bindassgcc@gmail.com	8787293330	Ganesh Chandra Chaurasiya
Mechanical Eng.	Tech	rakeshyadavme@gmail.com	9807385434	Rakesh Kumar Yadav
Geography	K12	mdsarfrajali02@gmail.com	9631928426	Md sarfraj ali
Chemistry	NEET	ishan891996sharma@gmail.com	8871294239	Ishan sharma
Geography	UPSC/PCS	swadeepshri@gmail.com	7999635417	Swadeep Shrivastava
Business Studies	K12	mishra.rishika029@gmail.com	9608842014	Rishika Mishra 
Computer	UGC-NET	mishradiva2024@gmail.com	9557682236	Divaroopa mishra 
English	Teaching	Dheerajkharwar141095@gmail.com	8928764486	Dheeraj Kharwar
Mathematics	Foundation	er.rahulraviraj@gmail.com	9386318074	Rahul Raviraj
GS	UPSC	pksraghuvanshi18@gmail.com	7985114398	piyush kumar singh
English	UGC-NET	19vikh@gmail.com	7408726445	Vikhyat Mishra.
Physics	NEET	mahennagar11@gmail.com	8770232537	Mahendra Nagar
Library Science	UGC-NET	themalikofficialy@gmail.com	8882461761	Simran
Mathematics	SSC	himanshusagar378@gmail.com	6386524141	Himanshu mishra
English	SSC	harshu790064@gmail.com	9758721304	Harsh kumar
Polity	UPSC/PCS	lohanimeenakshi@gmail.com	8077278361	Meenakshi lohani
Mathematics	K12	anshuking93043@gmail.com	9304385258	Anshu kumar 
Sociology	UGC-NET	shubhamkushwaha629@gmail.com	9630600101	Shubham Kushwaha 
Geography	Geography	mithunkumar46173@gmail.com	9598946244	Mithun Kumar
GS	SSC	stmusk1221@gmail.com	6307964551	Shubham Kumar Maurya
Biology	Biology	jaiswalpiyush7030@gmail.com	7030332009	Piyush Jaiswal
Biology	NEET	tanishqshukla572@gmail.com	7394838672	Tanishq Shukla
Sociology	Teaching	kmsheetal118@gmail.com	9058458790	Sheetal sharma
Mathematics	Foundation	parthavidhawan29@gmail.com	8178887646	Parthavi Dhawan
Mathematics	Foundation	sushantkumar3003@gmail.com	7632870300	Sushant Kumar
Mathematics	SSC	kyadav42117@gmail.com	7903489984	Krishna Yadav
Name 	Contact Number	Email Id 	Subject You Want To Teach ?	Vertical You Want To Teach ?
Rana Mrituanjay Singh 	9935177381	ranamrityunjay2015@gmail.com	History 	SSC
Mayank Kumar 	9140582792	mayankpathak0098@gmail.com	Maths	Foundation
Prem Raj 	8709131540	prempipul7209@gmail.com	Biology 	Neet
Alok gautam 	6306213359	aggautam93@gmail.com	English 	Foundation 
Sandeep kumar	7011329909	sksandeepraj936@gmail.com	Reasoning 	SSC
Lalit Yadav 	7668750481	lalityadav377433@gmail.com	Economy 	Ssc
Vishesh Verma 	8957885514	visheshverma2002real@gmail.com	Maths 	Foundation
Durga Tripathi 	7974585746	Durgatripathi092@gmail.com	Biology 	Teaching 
Parthavi Dhawan	8178887646	parthavidhawan29@gmail.com	Mathematics 	Foundation 
Piyush kumar singh 	7985114398	pksraghuvanshi18@gmail.com	Gs	Upsc 
Gyanendra Tiwari 	9289597892	Enlightengyan@gmail.com	Polity 	Upsc/state pcs
Amresh Kumar Sinha 	6202246044	asinhabgp@gmail.com	History and bihar special 	Bpsc,ssc
MITHUN KUMAR	9598946244	mithunkumar46173@gmail.com	Geography 	Geography 
Shubham gupta 	8077170988	guptashubham0093@gmail.com	Maths	SSC
Ram vibhor mishra	9559984830	ramvibhor060@gmail.com	History	UGC
Abhishek Kumar 	8506014748	abchauhan0802@gmail.com	Quantitative Aptitude 	Banking 
SHASHI KUMAR SAH 	9122634241	shashismo91@gmail.com	Maths	SSC
Sandeep Verma 	9162876007	Sv3274821@gmail.com	Political science 	K12
Chandan Pandey	9628931110	cpandey414@gmail.com	Geography	UGC - NET 
Tejus Soni 	9587280859	tejussoni91@gmail.com	Current Affairs	Civil Services Exams
Shivangi Sonkar 	7985334252	shivangi915sonkar@gmail.com	Biology 	K12
Brijesh Kumar 	9235193962	brijeshsir2959@gmail.com	Geography 	UPPSC
Anshu Kumar 	9304385258	anshuking93043@gmail.com	Maths	K12
Shubham Srivastava 	6306322361	shubhamsrivastava0022@gmail.com	Maths	Foundation
Uttam Singh 	9758580899	raghavuttam2111@gmail.com	GS	SSC
ADARSH BODANA	8302452605	adarshbodana85@gmail.com	Geography	UGC NET 
Anamika agrahari 	9140792851	anamikaanamikaagrahari62038@gmail.com	History 	UPSSSC / PCS
Shivendra Singh 	9793500617	shivendra9793500617@gmail.com	Maths 	SSC
GANESH CHANDRA CHAURASIYA	8787293330	bindassgcc@gmail.com	Biology	SSC
Deepak Sonu (Deepak Kumar)	7700820385	sonud9125@gmail.com	Maths 	SSC
Pooja Kumari 	9818915043	poojakumari01201997@gmail.com	English 	Foundation
Numan Shahabuddin 	9235835166	haanclasses@gmail.com	Maths	Foundation
Divyanshu tiwari 	9173470937	tiwaridivynshu@gmail.com	Reasoning 	SSC
Sunny Rai	9939715929	raisunny524@gmail.com	Geography 	SSC
Saurabh Kumar Dwivedi	7007424399	shubh29d@gmail.com	Maths	Teaching
Suryakant Singh	9452792871	drsurya2016@gmail.com	Biology	K12
Sagar	7828549239	sagarpatva1007@gmail.com	Zoology and botany	K12
Raj kumar Raju 	9065965757	16btag115@gmail.com	Biology 	Foundation 
Namrata Mishra 	8917088384	namratamishra232@gmail.com	Political Science/Civics	CUET PG
Md sarfraj ali 	9631928426	mdsarfrajali02@gmail.com	Geography 	K12
Anoop Patel 	7618898781	ap2320575@gmail.com	History 	Teaching
Milan Kumar 	8447354135	milankumar008@gmail.com	Political science, History Geography and Current Affairs 	K12
Vandana Singhal	6398214814	vandanasinghal1811@gmail.com	Maths	Foundation
Sambhu Kumar	8292522520	sambhukumar971@gmail.com	Maths	Foundation
Ravendra verma 	7974402952	ravendraverma1995@gmail.com	Building material & Construction 	Engineering 
SACHIN SRIVASTAVA 	8299016930	sachinsrivastava1160@gmail.com	History 	Foundation 
Devendra Singh 	9559474329	nedevendra95@gmail.Com	Chemistry 	Foundation +k12
Numan Shahabuddin 	9235835166	haanclasses@gmail.com	Maths	foundation
Shivanand Yadav 	9795224657	rajababushiva70@gmail.com	Maths 	 Foundation ,SSC ,  Teaching 
Subject you want to teach ?	Vertical you want to teach ?	Email Id 	Contact Number	Name
CDP	Teaching	anujaatmalik@gmail.com	7060958024	Anu Malik
CDP/Psychology	Teaching	ruchikhare300@gmail.com	7388964383	Ruchi khare
Maths	Banking	abhay.sengar10@gmail.com	8305453702	Abhay pratap singh
Physics	NEET	hemantchauhan578@gmail.com	9450174205	Hemant chauhan
Hindi	Teaching	bk6321776@gmail.com	8440831840	Bimla Kumari
History/Polity	UPSC/PCS	yvivek.1211@gmail.com	8115870900	Vivek 
Geography	CUET/UGC	drtcgurjar@gmail.com	8385950011	Dr. Tek Chand Gurjar
Maths	Banking	gujjarumang959@gmail.com	9354986742	Priyanka nagar
Biology	NEET	daminijnp01@gmail.com	8881034410	Damini Singh
Mathematics	Teaching	rathodmanisha336@gmail.com	8299016930	Sachin Srivastava
Chemistry	NEET	nedevendra95@gmail.Com	9559474329	Devendra Singh
English	UGC-NET	amitv9503@gmail.com	8577821838	 Amit kumar Verma
Psychology/CDP	Teaching	zainabfatimaansari350@gmail.com	9569434770	Zainab Fatima
Geography	Teaching	ashish.surfer20@gmail.com	7080806134	Ashish kumar saxena
Political Science	UGC-NET	namratamishra232@gmail.com	8917088384	Namrata Mishra
Mathematics	K12	triptimanjera8nov@gmail.com	8057635332	Tripti Manjera
Accountancy	CUET	vanijya.aditya@gmail.com	9006762842	Aditya Kumar
Current Affairs	UPSC	vaishalidixit618@gmail.com	8299471880	Vaishali dixit
History	Teaching	ap2320575@gmail.com	6390458593	Anoop Patel
GS(Polity)	SSC	bharadwajvatsal@gmail.com	9928122841	Vatsal Bhardwaj
Biology	K12	shivangi915sonkar@gmail.com	7985334252	Shivangi Sonkar
English	Banking	nitintenderone@gmail.com	9305006552	Nitin Chakravarti
Geography	SSC	raisunny524@gmail.com	9939715929	Sunny Rai
Science	SSC	dky3805@gmail.com	9616519928	Dinesh kumar yadav
Biology	NEET	yadavmegha424@gmail.com	7500020828	Megha yadav
History	UGC-NET	vedpbais2708@gmail.com	6393450386	Ved prakash bais.
History/Polity	UGC-NET	kuntalashok2001@gmail.com	7357499470	Kuntal Ashok
Mathematics	Teaching	jogendraamarsinghadj2410@gmail.com	8949619095	Jogendra singh
History/Polity	UPSC/PCS	abhaysingh21021995@gmail.com	7593844172	Abhay Singh
General Studies	SSC	Mmanvichawda@gmail.com	9068875463	Pooja
Reasoning	Banking	probankersinsights@gmail.com	7878806140	Pooja Agarwal
Geography	UGC-NET	adarshbodana85@gmail.com	8302452605	Adarsh Jain
Mathematics	Foundation	haanclasses@gmail.com	9235835166	Numam Shahabuddin
Mathematics	Foundation	vandanasinghal1811@gmail.com	6398214814	Vandana Singhal
Geography	UGC-NET	cpandey414@gmail.com	9628931110	Chandan Pandey
Biology	K12	drsurya2016@gmail.com	9452792871	Suryakant Singh 
General Studies	SSC	mmanvichawda@gmail.com	9068875463	Pooja rani
Mathematics	Banking	aamirkhan9731@gmail.com	7408510834	Amir Khan
Reasoning	SSC	tiwaridivynshu@gmail.com	9173470937	Divyanshu Trivedi
Computer	Tech	yash.praj2000@gmail.con	7267932323	Yash Prajapati
Mathematics	Teaching	rathodmanisha336@gmail.com	9004401809	Manisha Rathod
Reasoning	SSC	sksandeepraj936@gmail.com	7011329909	Sandeep Kumar 
Mathematics	SSC	shashismo91@gmail.com	9122634241	Shashi Kumar Sah
Mathematics	Teaching	rajababushiva70@gmail.com	9795224657	Shivanand Yadav
Geography	Teaching	brijeshsir2959@gmail.com	9235193962	Brijesh Chaudhary
History/Polity	UPSC/PCS	asinhabgp@gmail.com	6202246044	Amresh Kumar Sinha
Science	Foundation	pathakchinki3@gmail.com	9369547481	Harshita pathak
Mathematics	SSC	Hansraj7879451250@gmail.com	7879451250	Hansraj Meena
Current Affairs	Banking	shivam.rishav1998@gmail.com	7088712709	 Shivam Rishav
Mathematics	Foundation	sambhukumar971@gmail.com	8292522520	Sambhu Kumar
History	UPSC/PCS	anamikaanamikaagrahari62038@gmail.com	9140792851	Anamika Agrahari 
Biology	NEET	pushpendrasaini13@gmail.com	7891981055	Pushpendra Saini
Reasoning	SSC	rasheedanas515@gmail.com	9506480698	Anas Rasheed
Mathematics	Foundation	rkumarsc163@gmail.com	9134062670	Rohit Yadav
English	SSC	niteshwrites09@gmail.com	9534065435	Nitesh Kumar
GK	SSC	cdeep1890@gmail.com	8770914636	Prachi 
Mathematics	Foundation	rahulpandit67023@gmail.com	9305115362	Anirudh Sharma
English	SSC	rohitkhatri0209@gmail.com	9555743915	Rohit khatra
Chemistry	NEET	phalswal2509@gmail.com	7988057414	Himanshi
GK	SSC	himkuch86@gmail.com	6390296033	Himanshu Srivastava
Biology	NEET	Prempipul7209@gmail.com	8709131540	Prem raj
Geography	SSC	sonam620038@gmail.com	6200384801	Sonam Kumari
Mathematics	Teaching	yadavrahul72528@gmail.com	9598932803	Rahul Yadav
Current Affairs	UPSC	devnampriya767@gmail.com	8528742590	Akanksha 
Economics	UGC-NET	juhijrf1996@gmail.com	8745034635	Juhi
Mathematics	Banking	monikadhankar1999@gmail.com	8929254598	Monika Dhankar
Geography	UPSC/PCS	believeornoton@gmail.com	9313219277	Mritunjay kumar Gupta
Social Science	Foundation	Vyasswati0811@gmail.com	8750024244	Swati Chauhan
Humanities	Foundation	nitikamishra441@gmail.com	8955962723	Nitika Mishra
History/Polity	UPSC/PCS	srivastavagarima678@gmail.com	7355054986	Garima Srivastava
Current Affairs	UPSC/PCS	tejussoni91@gmail.com	9587280859	Tejus Soni.
History/Polity	SSC	001anubhavthakur0@gmail.com	8299338171	Anubhav Singh
GK/GS	UPSC/PCS	chandraprakashg535@gmail.com	9129645707	Chandra Prakash Gupta
Biology	Teaching	durgatripathi092@gmail.com	7974585746	Durga Tripathi
Urdu/Arabic	K12	shahnawazmaulvi@gmail.com	9634193607	Mohammad Shahnawaz
Mathematics	Foundation	rs9702761@gmail.com	6397251799	Rahul Upadhyay
Reasoning	Banking	mishraakansha2204@gmail.com	9616608950	Akanksha mishra
English	Foundation	pandeyakash546@gmail.com	9140683075	Akash Pandey
Biology	Foundation	bindassgcc@gmail.com	8787293330	Ganesh Chandra Chaurasiya
Mechanical Eng.	Tech	rakeshyadavme@gmail.com	9807385434	Rakesh Kumar Yadav
Geography	K12	mdsarfrajali02@gmail.com	9631928426	Md sarfraj ali
Chemistry	NEET	ishan891996sharma@gmail.com	8871294239	Ishan sharma
Geography	UPSC/PCS	swadeepshri@gmail.com	7999635417	Swadeep Shrivastava
Business Studies	K12	mishra.rishika029@gmail.com	9608842014	Rishika Mishra 
Computer	UGC-NET	mishradiva2024@gmail.com	9557682236	Divaroopa mishra 
English	Teaching	Dheerajkharwar141095@gmail.com	8928764486	Dheeraj Kharwar
Mathematics	Foundation	er.rahulraviraj@gmail.com	9386318074	Rahul Raviraj
GS	UPSC	pksraghuvanshi18@gmail.com	7985114398	piyush kumar singh
English	UGC-NET	19vikh@gmail.com	7408726445	Vikhyat Mishra.
Physics	NEET	mahennagar11@gmail.com	8770232537	Mahendra Nagar
Library Science	UGC-NET	themalikofficialy@gmail.com	8882461761	Simran
Mathematics	SSC	himanshusagar378@gmail.com	6386524141	Himanshu mishra
English	SSC	harshu790064@gmail.com	9758721304	Harsh kumar
Polity	UPSC/PCS	lohanimeenakshi@gmail.com	8077278361	Meenakshi lohani
Mathematics	K12	anshuking93043@gmail.com	9304385258	Anshu kumar 
Sociology	UGC-NET	shubhamkushwaha629@gmail.com	9630600101	Shubham Kushwaha 
Geography	Geography	mithunkumar46173@gmail.com	9598946244	Mithun Kumar
GS	SSC	stmusk1221@gmail.com	6307964551	Shubham Kumar Maurya
Biology	Biology	jaiswalpiyush7030@gmail.com	7030332009	Piyush Jaiswal
Biology	NEET	tanishqshukla572@gmail.com	7394838672	Tanishq Shukla
Sociology	Teaching	kmsheetal118@gmail.com	9058458790	Sheetal sharma
Mathematics	Foundation	parthavidhawan29@gmail.com	8178887646	Parthavi Dhawan
Mathematics	Foundation	sushantkumar3003@gmail.com	7632870300	Sushant Kumar
Mathematics	SSC	kyadav42117@gmail.com	7903489984	Krishna Yadav
Name 	Contact Number	Email Id 	Subject You Want To Teach ?	Vertical You Want To Teach ?
Rana Mrituanjay Singh 	9935177381	ranamrityunjay2015@gmail.com	History 	SSC
Mayank Kumar 	9140582792	mayankpathak0098@gmail.com	Maths	Foundation
Prem Raj 	8709131540	prempipul7209@gmail.com	Biology 	Neet
Alok gautam 	6306213359	aggautam93@gmail.com	English 	Foundation 
Sandeep kumar	7011329909	sksandeepraj936@gmail.com	Reasoning 	SSC
Lalit Yadav 	7668750481	lalityadav377433@gmail.com	Economy 	Ssc
Vishesh Verma 	8957885514	visheshverma2002real@gmail.com	Maths 	Foundation
Durga Tripathi 	7974585746	Durgatripathi092@gmail.com	Biology 	Teaching 
Parthavi Dhawan	8178887646	parthavidhawan29@gmail.com	Mathematics 	Foundation 
Piyush kumar singh 	7985114398	pksraghuvanshi18@gmail.com	Gs	Upsc 
Gyanendra Tiwari 	9289597892	Enlightengyan@gmail.com	Polity 	Upsc/state pcs
Amresh Kumar Sinha 	6202246044	asinhabgp@gmail.com	History and bihar special 	Bpsc,ssc
MITHUN KUMAR	9598946244	mithunkumar46173@gmail.com	Geography 	Geography 
Shubham gupta 	8077170988	guptashubham0093@gmail.com	Maths	SSC
Ram vibhor mishra	9559984830	ramvibhor060@gmail.com	History	UGC
Abhishek Kumar 	8506014748	abchauhan0802@gmail.com	Quantitative Aptitude 	Banking 
SHASHI KUMAR SAH 	9122634241	shashismo91@gmail.com	Maths	SSC
Sandeep Verma 	9162876007	Sv3274821@gmail.com	Political science 	K12
Chandan Pandey	9628931110	cpandey414@gmail.com	Geography	UGC - NET 
Tejus Soni 	9587280859	tejussoni91@gmail.com	Current Affairs	Civil Services Exams
Shivangi Sonkar 	7985334252	shivangi915sonkar@gmail.com	Biology 	K12
Brijesh Kumar 	9235193962	brijeshsir2959@gmail.com	Geography 	UPPSC
Anshu Kumar 	9304385258	anshuking93043@gmail.com	Maths	K12
Shubham Srivastava 	6306322361	shubhamsrivastava0022@gmail.com	Maths	Foundation
Uttam Singh 	9758580899	raghavuttam2111@gmail.com	GS	SSC
ADARSH BODANA	8302452605	adarshbodana85@gmail.com	Geography	UGC NET 
Anamika agrahari 	9140792851	anamikaanamikaagrahari62038@gmail.com	History 	UPSSSC / PCS
Shivendra Singh 	9793500617	shivendra9793500617@gmail.com	Maths 	SSC
GANESH CHANDRA CHAURASIYA	8787293330	bindassgcc@gmail.com	Biology	SSC
Deepak Sonu (Deepak Kumar)	7700820385	sonud9125@gmail.com	Maths 	SSC
Pooja Kumari 	9818915043	poojakumari01201997@gmail.com	English 	Foundation
Numan Shahabuddin 	9235835166	haanclasses@gmail.com	Maths	Foundation
Divyanshu tiwari 	9173470937	tiwaridivynshu@gmail.com	Reasoning 	SSC
Sunny Rai	9939715929	raisunny524@gmail.com	Geography 	SSC
Saurabh Kumar Dwivedi	7007424399	shubh29d@gmail.com	Maths	Teaching
Suryakant Singh	9452792871	drsurya2016@gmail.com	Biology	K12
Sagar	7828549239	sagarpatva1007@gmail.com	Zoology and botany	K12
Raj kumar Raju 	9065965757	16btag115@gmail.com	Biology 	Foundation 
Namrata Mishra 	8917088384	namratamishra232@gmail.com	Political Science/Civics	CUET PG
Md sarfraj ali 	9631928426	mdsarfrajali02@gmail.com	Geography 	K12
Anoop Patel 	7618898781	ap2320575@gmail.com	History 	Teaching
Milan Kumar 	8447354135	milankumar008@gmail.com	Political science, History Geography and Current Affairs 	K12
Vandana Singhal	6398214814	vandanasinghal1811@gmail.com	Maths	Foundation
Sambhu Kumar	8292522520	sambhukumar971@gmail.com	Maths	Foundation
Ravendra verma 	7974402952	ravendraverma1995@gmail.com	Building material & Construction 	Engineering 
SACHIN SRIVASTAVA 	8299016930	sachinsrivastava1160@gmail.com	History 	Foundation 
Devendra Singh 	9559474329	nedevendra95@gmail.Com	Chemistry 	Foundation +k12
Numan Shahabuddin 	9235835166	haanclasses@gmail.com	Maths	foundation
Shivanand Yadav 	9795224657	rajababushiva70@gmail.com	Maths 	 Foundation ,SSC ,  Teaching 
Subject you want to teach ?	Vertical you want to teach ?	Email Id 	Contact Number	Name
CDP	Teaching	anujaatmalik@gmail.com	7060958024	Anu Malik
CDP/Psychology	Teaching	ruchikhare300@gmail.com	7388964383	Ruchi khare
Maths	Banking	abhay.sengar10@gmail.com	8305453702	Abhay pratap singh
Physics	NEET	hemantchauhan578@gmail.com	9450174205	Hemant chauhan
Hindi	Teaching	bk6321776@gmail.com	8440831840	Bimla Kumari
History/Polity	UPSC/PCS	yvivek.1211@gmail.com	8115870900	Vivek 
Geography	CUET/UGC	drtcgurjar@gmail.com	8385950011	Dr. Tek Chand Gurjar
Maths	Banking	gujjarumang959@gmail.com	9354986742	Priyanka nagar
Biology	NEET	daminijnp01@gmail.com	8881034410	Damini Singh
Mathematics	Teaching	rathodmanisha336@gmail.com	8299016930	Sachin Srivastava
Chemistry	NEET	nedevendra95@gmail.Com	9559474329	Devendra Singh
English	UGC-NET	amitv9503@gmail.com	8577821838	 Amit kumar Verma
Psychology/CDP	Teaching	zainabfatimaansari350@gmail.com	9569434770	Zainab Fatima
Geography	Teaching	ashish.surfer20@gmail.com	7080806134	Ashish kumar saxena
Political Science	UGC-NET	namratamishra232@gmail.com	8917088384	Namrata Mishra
Mathematics	K12	triptimanjera8nov@gmail.com	8057635332	Tripti Manjera
Accountancy	CUET	vanijya.aditya@gmail.com	9006762842	Aditya Kumar
Current Affairs	UPSC	vaishalidixit618@gmail.com	8299471880	Vaishali dixit
History	Teaching	ap2320575@gmail.com	6390458593	Anoop Patel
GS(Polity)	SSC	bharadwajvatsal@gmail.com	9928122841	Vatsal Bhardwaj
Biology	K12	shivangi915sonkar@gmail.com	7985334252	Shivangi Sonkar
English	Banking	nitintenderone@gmail.com	9305006552	Nitin Chakravarti
Geography	SSC	raisunny524@gmail.com	9939715929	Sunny Rai
Science	SSC	dky3805@gmail.com	9616519928	Dinesh kumar yadav
Biology	NEET	yadavmegha424@gmail.com	7500020828	Megha yadav
History	UGC-NET	vedpbais2708@gmail.com	6393450386	Ved prakash bais.
History/Polity	UGC-NET	kuntalashok2001@gmail.com	7357499470	Kuntal Ashok
Mathematics	Teaching	jogendraamarsinghadj2410@gmail.com	8949619095	Jogendra singh
History/Polity	UPSC/PCS	abhaysingh21021995@gmail.com	7593844172	Abhay Singh
General Studies	SSC	Mmanvichawda@gmail.com	9068875463	Pooja
Reasoning	Banking	probankersinsights@gmail.com	7878806140	Pooja Agarwal
Geography	UGC-NET	adarshbodana85@gmail.com	8302452605	Adarsh Jain
Mathematics	Foundation	haanclasses@gmail.com	9235835166	Numam Shahabuddin
Mathematics	Foundation	vandanasinghal1811@gmail.com	6398214814	Vandana Singhal
Geography	UGC-NET	cpandey414@gmail.com	9628931110	Chandan Pandey
Biology	K12	drsurya2016@gmail.com	9452792871	Suryakant Singh 
General Studies	SSC	mmanvichawda@gmail.com	9068875463	Pooja rani
Mathematics	Banking	aamirkhan9731@gmail.com	7408510834	Amir Khan
Reasoning	SSC	tiwaridivynshu@gmail.com	9173470937	Divyanshu Trivedi
Computer	Tech	yash.praj2000@gmail.con	7267932323	Yash Prajapati
Mathematics	Teaching	rathodmanisha336@gmail.com	9004401809	Manisha Rathod
Reasoning	SSC	sksandeepraj936@gmail.com	7011329909	Sandeep Kumar 
Mathematics	SSC	shashismo91@gmail.com	9122634241	Shashi Kumar Sah
Mathematics	Teaching	rajababushiva70@gmail.com	9795224657	Shivanand Yadav
Geography	Teaching	brijeshsir2959@gmail.com	9235193962	Brijesh Chaudhary
History/Polity	UPSC/PCS	asinhabgp@gmail.com	6202246044	Amresh Kumar Sinha
Science	Foundation	pathakchinki3@gmail.com	9369547481	Harshita pathak
Mathematics	SSC	Hansraj7879451250@gmail.com	7879451250	Hansraj Meena
Current Affairs	Banking	shivam.rishav1998@gmail.com	7088712709	 Shivam Rishav
Mathematics	Foundation	sambhukumar971@gmail.com	8292522520	Sambhu Kumar
History	UPSC/PCS	anamikaanamikaagrahari62038@gmail.com	9140792851	Anamika Agrahari 
Biology	NEET	pushpendrasaini13@gmail.com	7891981055	Pushpendra Saini
Reasoning	SSC	rasheedanas515@gmail.com	9506480698	Anas Rasheed
Mathematics	Foundation	rkumarsc163@gmail.com	9134062670	Rohit Yadav
English	SSC	niteshwrites09@gmail.com	9534065435	Nitesh Kumar
GK	SSC	cdeep1890@gmail.com	8770914636	Prachi 
Mathematics	Foundation	rahulpandit67023@gmail.com	9305115362	Anirudh Sharma
English	SSC	rohitkhatri0209@gmail.com	9555743915	Rohit khatra
Chemistry	NEET	phalswal2509@gmail.com	7988057414	Himanshi
GK	SSC	himkuch86@gmail.com	6390296033	Himanshu Srivastava
Biology	NEET	Prempipul7209@gmail.com	8709131540	Prem raj
Geography	SSC	sonam620038@gmail.com	6200384801	Sonam Kumari
Mathematics	Teaching	yadavrahul72528@gmail.com	9598932803	Rahul Yadav
Current Affairs	UPSC	devnampriya767@gmail.com	8528742590	Akanksha 
Economics	UGC-NET	juhijrf1996@gmail.com	8745034635	Juhi
Mathematics	Banking	monikadhankar1999@gmail.com	8929254598	Monika Dhankar
Geography	UPSC/PCS	believeornoton@gmail.com	9313219277	Mritunjay kumar Gupta
Social Science	Foundation	Vyasswati0811@gmail.com	8750024244	Swati Chauhan
Humanities	Foundation	nitikamishra441@gmail.com	8955962723	Nitika Mishra
History/Polity	UPSC/PCS	srivastavagarima678@gmail.com	7355054986	Garima Srivastava
Current Affairs	UPSC/PCS	tejussoni91@gmail.com	9587280859	Tejus Soni.
History/Polity	SSC	001anubhavthakur0@gmail.com	8299338171	Anubhav Singh
GK/GS	UPSC/PCS	chandraprakashg535@gmail.com	9129645707	Chandra Prakash Gupta
Biology	Teaching	durgatripathi092@gmail.com	7974585746	Durga Tripathi
Urdu/Arabic	K12	shahnawazmaulvi@gmail.com	9634193607	Mohammad Shahnawaz
Mathematics	Foundation	rs9702761@gmail.com	6397251799	Rahul Upadhyay
Reasoning	Banking	mishraakansha2204@gmail.com	9616608950	Akanksha mishra
English	Foundation	pandeyakash546@gmail.com	9140683075	Akash Pandey
Biology	Foundation	bindassgcc@gmail.com	8787293330	Ganesh Chandra Chaurasiya
Mechanical Eng.	Tech	rakeshyadavme@gmail.com	9807385434	Rakesh Kumar Yadav
Geography	K12	mdsarfrajali02@gmail.com	9631928426	Md sarfraj ali
Chemistry	NEET	ishan891996sharma@gmail.com	8871294239	Ishan sharma
Geography	UPSC/PCS	swadeepshri@gmail.com	7999635417	Swadeep Shrivastava
Business Studies	K12	mishra.rishika029@gmail.com	9608842014	Rishika Mishra 
Computer	UGC-NET	mishradiva2024@gmail.com	9557682236	Divaroopa mishra 
English	Teaching	Dheerajkharwar141095@gmail.com	8928764486	Dheeraj Kharwar
Mathematics	Foundation	er.rahulraviraj@gmail.com	9386318074	Rahul Raviraj
GS	UPSC	pksraghuvanshi18@gmail.com	7985114398	piyush kumar singh
English	UGC-NET	19vikh@gmail.com	7408726445	Vikhyat Mishra.
Physics	NEET	mahennagar11@gmail.com	8770232537	Mahendra Nagar
Library Science	UGC-NET	themalikofficialy@gmail.com	8882461761	Simran
Mathematics	SSC	himanshusagar378@gmail.com	6386524141	Himanshu mishra
English	SSC	harshu790064@gmail.com	9758721304	Harsh kumar
Polity	UPSC/PCS	lohanimeenakshi@gmail.com	8077278361	Meenakshi lohani
Mathematics	K12	anshuking93043@gmail.com	9304385258	Anshu kumar 
Sociology	UGC-NET	shubhamkushwaha629@gmail.com	9630600101	Shubham Kushwaha 
Geography	Geography	mithunkumar46173@gmail.com	9598946244	Mithun Kumar
GS	SSC	stmusk1221@gmail.com	6307964551	Shubham Kumar Maurya
Biology	Biology	jaiswalpiyush7030@gmail.com	7030332009	Piyush Jaiswal
Biology	NEET	tanishqshukla572@gmail.com	7394838672	Tanishq Shukla
Sociology	Teaching	kmsheetal118@gmail.com	9058458790	Sheetal sharma
Mathematics	Foundation	parthavidhawan29@gmail.com	8178887646	Parthavi Dhawan
Mathematics	Foundation	sushantkumar3003@gmail.com	7632870300	Sushant Kumar
Mathematics	SSC	kyadav42117@gmail.com	7903489984	Krishna Yadav
Ashish kumar saxena	7080806134	ashish.surfer20@gmail.com	Geography	Teaching
Zainab Fatima	9569434770	zainabfatimaansari350@gmail.com	Psychology	K12
Nitika Mishra	8955962723	nitikamishra441@gmail.com	Humanities	Foundation
Sandeep verma	9162876007	sv3274821@gmail.com	Political science	K12
Devendra Singh	9559474329	nedevendra95@gmail.Com	Chemistry	K12
Krishna Rajput	9761055810	kanhiyalodhi657@gmail.com	Reasoning	SSC
Ankit pal	9250202065	palankit253@gmail.com	Mathematics	Teaching
Sumedha Trivedi	9457027231	trivedisumedha24@gmail.com	Political science	UGC NET
Neha goel	8447186352	nehagoel030@gmail.com	Reasoning	SSC
Sujoy Modak	8016286777	sujoymodak58@gmail.com	Mathematics	Railway
Ravindra Singh	8739983647	ravindradeval@gmail.com	Polity	Teaching
Anshuman	9717249886	anshuman.kumarr@gmail.com	Geography	CUET
Mrityunjay kumar Gupta	9313219277	believeornoton@gmail.com	Geography	UPSC
Monika Dhankar	8929254598	monikadhankar1999@gmail.com	Mathematics	Banking
Chandra Prakash Gupta	9129645707	chandraprakashg535@gmail.com	GK/GS	UP State Exams
Chandan Pandey	9628931110	cpandey414@gmail.com	Geography	UGC-NET
Ankit Pal	9250202065	palankit253@gmail.com	Mathematics	Teaching
Chandan Pandey	9628931110	cpandey414@gmail.com	Geography	UGC-NET
Krishna Yadav	7903489984	kyadav42117@gmail.com	Mathematics	SSC
Pushpendra Saini	7891981055	pushpendrasaini13@gmail.com	Biology	NEET`;

function parseRawSheetData(text: string) {
  const lines = text.trim().split("\n");
  const usersList: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t").map(c => c.trim());
    if (cols.length < 5) continue;
    
    const emailIdx = cols.findIndex(c => c.includes("@"));
    if (emailIdx === -1) continue;
    
    let name = "";
    let phone = "";
    let email = cols[emailIdx];
    let subject = "";
    let vertical = "";
    
    if (emailIdx === 2) {
      // First format: Name (0), Phone (1), Email (2), Subject (3), Vertical (4)
      // Second format: Subject (0), Vertical (1), Email (2), Phone (3), Name (4)
      const isPhone = /^[0-9+\s\-&]+$/.test(cols[1]);
      if (isPhone) {
        name = cols[0];
        phone = cols[1];
        subject = cols[3];
        vertical = cols[4];
      } else {
        subject = cols[0];
        vertical = cols[1];
        phone = cols[3];
        name = cols[4];
      }
    } else {
      name = cols[0];
      phone = cols[1];
      subject = cols[3];
      vertical = cols[4];
    }
    
    if (!name || !email) continue;
    usersList.push({ name, phone, email, subject, vertical });
  }
  return usersList;
}

async function seed() {
  const parsedUsers = parseRawSheetData(RAW_DATA);
  console.log(`Parsed ${parsedUsers.length} users from sheet data.`);
  
  const scan = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const existingEmails = new Set(
    (scan.Items ?? []).map((u) => String(u.email).toLowerCase().trim())
  );
  
  const passwordHash = await bcrypt.hash("fep123", 10);
  let seededCount = 0;
  
  for (const u of parsedUsers) {
    const emailClean = u.email.toLowerCase().trim();
    if (existingEmails.has(emailClean)) {
      continue;
    }
    
    // Refine subject & vertical
    const refined = refineSubjectAndVertical(u.subject, u.vertical);
    
    await ddb.send(
      new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(),
          name: u.name,
          email: emailClean,
          phone: u.phone,
          role: "fep_faculty",
          subjects: [refined.verticalId],
          teachingSubject: refined.name,
          examTarget: u.vertical,
          cohort: "June FEP",
          passwordHash,
          createdAt: new Date().toISOString(),
        },
      })
    );
    seededCount++;
    console.log(`  Seeded faculty: ${u.name} (${emailClean})`);
  }
  
  console.log(`\n✓ Seeded ${seededCount} missing faculty users into DynamoDB!`);
}

seed().catch(console.error);
