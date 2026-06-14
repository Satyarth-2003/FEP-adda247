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

const REQUESTED_EMAILS = [
  "9213403071r@gmail.com",
  "danishhussain653@gmail.com",
  "ramvibhor060@gmail.com",
  "Madhu.madhushakya@gmail.com",
  "kumarisanchita67@gmail.com",
  "anujaatmalik@gmail.com",
  "shubh29d@gmail.com",
  "sonud9125@gmail.com",
  "sumitmunjal63@gmail.com",
  "ruchikhare300@gmail.com",
  "anishissinha@gmail.com",
  "k661kajal@gmail.com",
  "akanksharay03@gmail.com",
  "abhay.sengar10@gmail.com",
  "milankumar008@gmail.com",
  "visheshverma2002real@gmail.com",
  "guptashubham0093@gmail.com",
  "nehagoel030@gmail.com",
  "hemantchauhan578@gmail.com",
  "bk6321776@gmail.com",
  "mnisk98@gmail.com",
  "tezendergulia93@gmail.com",
  "ashu14june@gmail.com",
  "Gurindersingh2185@gmail.com",
  "yvivek.1211@gmail.com",
  "drtcgurjar@gmail.com",
  "singhnehaa478@gmail.com",
  "ripukbc2018@gmail.com",
  "vinodinee26@gmail.com",
  "anilku1094@gmail.com",
  "sujoymodak58@gmail.com",
  "rahulsharma74187@gmail.com",
  "pruthasaha09@gmail.com",
  "pramilayaduvanshi@gmail.com",
  "gujjarumang959@gmail.com",
  "mishitri7071@gmail.com",
  "pandeysudhindraudaybhan@gmail.com",
  "rupeshkumar.adv23@gmail.com",
  "akankshakumari582003@gmail.com",
  "rishabhrajadj1234@gmail.com",
  "aggautam93@gmail.com",
  "meenudevi8299@gmail.com",
  "abhaysingh21021995@gmail.com",
  "hayatnaaz222@gmail.com",
  "abchauhan0802@gmail.com",
  "surbhi.jindal1311@gmail.com",
  "yjitendra5797@gmail.com",
  "pandeygsibbu@gmail.com",
  "vermarajni03558@gmail.com",
  "ravendraverma1995@gmail.com",
  "16btag115@gmail.com",
  "mayankpathak0098@gmail.com",
  "sagarpatva1007@gmail.com",
  "raghavuttam2111@gmail.com",
  "chhayacpr251299@gmail.com",
  "ershoiab59@kgpian.iitkgp.ac.in",
  "kanhiyalodhi657@gmail.com",
  "contactneha30@gmail.com",
  "poojakumari01201997@gmail.com",
  "ranamrityunjay2015@gmail.com",
  "trivedisumedha24@gmail.com",
  "sachinsrivastava1160@gmail.com",
  "prakashpratap0@gmail.com",
  "sv3274821@gmail.com",
  "daminijnp01@gmail.com",
  "kanttulsi03@gmail.com",
  "harpreetkaurpmkk@gmail.com",
  "tikesh961725@gmail.com",
  "ravindradeval@gmail.com",
  "poonamtiwari3030@gmail.com",
  "vy607092@gmail.com",
  "manjunathbhardwaj91@gmail.com",
  "anshdham04@gmail.com",
  "shubhamsrivastava0022@gmail.com",
  "singhanupam517@gmail.com",
  "deepak7838505185@gmail.com",
  "educatorshivam1@gmail.com",
  "Shivendra9793500617@gmail.com",
  "Pgupta888@gmail.com",
  "lalityadav377433@gmail.com",
  "kohifacto@gmail.com",
  "palankit253@gmail.com",
  "pv955929@gmail.com",
  "anshuman.kumarr@gmail.com",
  "tamannakumari9911@gmail.com",
  "radharawat0156@gmail.com",
  "shraddhasharma8840@gmail.com",
  "nedevendra95@gmail.Com",
  "amitv9503@gmail.com",
  "zainabfatimaansari350@gmail.com",
  "ashish.surfer20@gmail.com",
  "namratamishra232@gmail.com",
  "Enlightengyan@gmail.com",
  "triptimanjera8nov@gmail.com",
  "vanijya.aditya@gmail.com",
  "vaishalidixit618@gmail.com",
  "ap2320575@gmail.com",
  "bharadwajvatsal@gmail.com",
  "shivangi915sonkar@gmail.com",
  "nitintenderone@gmail.com",
  "raisunny524@gmail.com",
  "dky3805@gmail.com",
  "yadavmegha424@gmail.com",
  "vedpbais2708@gmail.com",
  "kuntalashok2001@gmail.com",
  "jogendraamarsinghadj2410@gmail.com",
  "Mmanvichawda@gmail.com",
  "rathodmanisha336@gmail.com",
  "probankersinsights@gmail.com",
  "adarshbodana85@gmail.com",
  "haanclasses@gmail.com",
  "vandanasinghal1811@gmail.com",
  "cpandey414@gmail.com",
  "drsurya2016@gmail.com",
  "aamirkhan9731@gmail.com",
  "tiwaridivynshu@gmail.com",
  "yash.praj2000@gmail.con",
  "shashismo91@gmail.com",
  "rajababushiva70@gmail.com",
  "brijeshsir2959@gmail.com",
  "asinhabgp@gmail.com",
  "pathakchinki3@gmail.com",
  "Hansraj7879451250@gmail.com",
  "shivam.rishav1998@gmail.com",
  "sambhukumar971@gmail.com",
  "anamikaanamikaagrahari62038@gmail.com",
  "pushpendrasaini13@gmail.com",
  "rasheedanas515@gmail.com",
  "rkumarsc163@gmail.com",
  "niteshwrites09@gmail.com",
  "cdeep1890@gmail.com",
  "rahulpandit67023@gmail.com",
  "rohitkhatri0209@gmail.com",
  "phalswal2509@gmail.com",
  "himkuch86@gmail.com",
  "Prempipul7209@gmail.com",
  "sonam620038@gmail.com",
  "yadavrahul72528@gmail.com",
  "devnampriya767@gmail.com",
  "juhijrf1996@gmail.com",
  "monikadhankar1999@gmail.com",
  "believeornoton@gmail.com",
  "Vyasswati0811@gmail.com",
  "nitikamishra441@gmail.com",
  "srivastavagarima678@gmail.com",
  "tejussoni91@gmail.com",
  "001anubhavthakur0@gmail.com",
  "chandraprakashg535@gmail.com",
  "durgatripathi092@gmail.com",
  "shahnawazmaulvi@gmail.com",
  "rs9702761@gmail.com",
  "mishraakansha2204@gmail.com",
  "pandeyakash546@gmail.com",
  "bindassgcc@gmail.com",
  "rakeshyadavme@gmail.com",
  "mdsarfrajali02@gmail.com",
  "ishan891996sharma@gmail.com",
  "swadeepshri@gmail.com",
  "mishra.rishika029@gmail.com",
  "mishradiva2024@gmail.com",
  "Dheerajkharwar141095@gmail.com",
  "er.rahulraviraj@gmail.com",
  "pksraghuvanshi18@gmail.com",
  "19vikh@gmail.com",
  "mahennagar11@gmail.com",
  "themalikofficialy@gmail.com",
  "himanshusagar378@gmail.com",
  "harshu790064@gmail.com",
  "lohanimeenakshi@gmail.com",
  "anshuking93043@gmail.com",
  "shubhamkushwaha629@gmail.com",
  "mithunkumar46173@gmail.com",
  "stmusk1221@gmail.com",
  "jaiswalpiyush7030@gmail.com",
  "tanishqshukla572@gmail.com",
  "kmsheetal118@gmail.com",
  "parthavidhawan29@gmail.com",
  "sushantkumar3003@gmail.com",
  "kyadav42117@gmail.com",
];

async function verify() {
  const scan = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const existingEmails = new Set(
    (scan.Items ?? []).map((u) => String(u.email).toLowerCase().trim())
  );

  console.log(`Scanning db: Found ${existingEmails.size} users.`);

  const missing: string[] = [];
  const found: string[] = [];

  for (const email of REQUESTED_EMAILS) {
    const clean = email.toLowerCase().trim();
    if (existingEmails.has(clean)) {
      found.push(email);
    } else {
      missing.push(email);
    }
  }

  console.log("\nVerification Results:");
  console.log(`Found: ${found.length} / ${REQUESTED_EMAILS.length}`);
  console.log(`Missing: ${missing.length} / ${REQUESTED_EMAILS.length}`);

  if (missing.length > 0) {
    console.log("\nMissing Emails:");
    missing.forEach((m) => console.log(`  - ${m}`));
  } else {
    console.log("\n✓ All requested users exist in DynamoDB!");
  }
}

verify().catch(console.error);
