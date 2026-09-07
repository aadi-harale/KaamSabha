export type Locale = 'en' | 'hi' | 'mr';

const messages = {
  en: {
    appName: 'KAAMSABHA',
    roleCustomer: 'Customer',
    roleWorker: 'Worker-member',
    roleOperations: 'Operations',
    judgeDemo: 'Judge demo',
    language: 'Language',
    bookHelp: 'What do you need help with?',
    createJob: 'Create job and dispatch',
    fairWork: 'Fair Work',
    fairWorkHelp: "See how opportunities are shared and challenge decisions that don't look right.",
    today: 'Today',
    jobs: 'Jobs',
    earnings: 'Earnings',
    more: 'More',
    acceptOffer: 'Accept offer',
    startTravel: 'Start travelling',
    arrived: 'I have arrived',
    requestStartCode: 'Request start code',
    verifyStartCode: 'Verify and start work',
    requestCompletionCode: 'Request completion code',
    verifyCompletionCode: 'Verify and complete work',
    startCode: 'Start code',
    completionCode: 'Completion code',
    evidence: 'Work proof',
    currentRule: 'Current rule',
    challenges: 'Challenges',
    votes: 'Votes',
    opportunities: 'My opportunities',
    whyDecision: 'Why this decision',
    activePolicy: 'Active constitution',
    demoAccess: 'Demo role access',
    offlineMode: 'Offline demo mode',
    connectionReady: 'Device-local records ready',
    newRequest: 'New service request', service: 'Service', locality: 'Locality', schedule: 'Time on 7 September', describe: 'What should the member expect?', aiHelp: 'Help me describe the problem', referencePhoto: 'Add a reference photo', emergency: 'Emergency request', workerPay: 'Worker service pay', welfare: 'Welfare contribution', operationsShare: 'Cooperative operations', customerTotal: 'Your total', jobRecords: 'Your job records', openReceipt: 'Open receipt', cancelJob: 'Cancel job', liveWork: 'Live work', bookedScope: 'Booked scope', estimatedCosts: 'Frozen estimated costs', estimatedNet: 'Estimated net', declineSafe: 'Decline without rank penalty', noOffers: 'No assigned work right now. New offers will appear here.', settledWallet: 'Settled local wallet', workload: 'My workload boundary', howItWorks: 'How KAAMSABHA works', completed: 'Completed', offered: 'Offered', travelling: 'Travelling', arrival: 'Arrived', working: 'In progress', verification: 'Verification needed', cancelled: 'Cancelled',
    bookingSub: 'Your request runs through the active constitution immediately.', actingWorker: 'Acting as worker-member', workerWork: 'work', workerSub: 'Offers, earnings and explanations from the same shared records.', thisWeek: 'This week', estimatedLivelihood: 'Estimated net livelihood', validOpportunities: 'Valid opportunities', jobsAccepted: 'Jobs accepted', completedWorkNet: 'Completed-work net', dividends: 'Cooperative dividends', penalties: 'Penalties and remedies', travelProtection: 'Travel protection', fairAccessHelp: 'KAAMSABHA looks at both what you earned and whether you were genuinely given chances to work. Declines are never scored against you.', roadRoute: 'Road route', approximatePath: 'Approximate service path', memberArrived: 'Member arrived', simulatedTravel: 'Simulated travel for demo. Customer and worker read the same saved progress.',
  },
  hi: {
    appName: 'कामसभा', roleCustomer: 'ग्राहक', roleWorker: 'कामगार-सदस्य', roleOperations: 'सहकारी संचालन', judgeDemo: 'जज डेमो', language: 'भाषा',
    bookHelp: 'आपको किस काम में मदद चाहिए?', createJob: 'काम बनाएँ और सदस्य चुनें', fairWork: 'न्यायपूर्ण काम', fairWorkHelp: 'देखें कि काम के अवसर कैसे बाँटे जाते हैं और गलत निर्णय को चुनौती दें।',
    today: 'आज', jobs: 'काम', earnings: 'कमाई', more: 'अन्य', acceptOffer: 'काम स्वीकार करें', startTravel: 'यात्रा शुरू करें', arrived: 'मैं पहुँच गया/गई',
    requestStartCode: 'काम शुरू करने का कोड माँगें', verifyStartCode: 'कोड जाँचें और काम शुरू करें', requestCompletionCode: 'काम पूरा करने का कोड माँगें', verifyCompletionCode: 'कोड जाँचें और काम पूरा करें',
    startCode: 'शुरुआत कोड', completionCode: 'समापन कोड', evidence: 'काम का प्रमाण', currentRule: 'मौजूदा नियम', challenges: 'चुनौतियाँ', votes: 'मतदान', opportunities: 'मेरे अवसर', whyDecision: 'यह निर्णय क्यों', activePolicy: 'सक्रिय संविधान', demoAccess: 'डेमो भूमिका प्रवेश', offlineMode: 'ऑफ़लाइन डेमो मोड', connectionReady: 'डिवाइस के रिकॉर्ड तैयार हैं',
    newRequest: 'नई सेवा का अनुरोध', service: 'सेवा', locality: 'इलाका', schedule: '7 सितंबर का समय', describe: 'सदस्य को काम के बारे में क्या पता होना चाहिए?', aiHelp: 'समस्या लिखने में मदद लें', referencePhoto: 'संदर्भ फोटो जोड़ें', emergency: 'आपात अनुरोध', workerPay: 'कामगार सेवा भुगतान', welfare: 'कल्याण योगदान', operationsShare: 'सहकारी संचालन', customerTotal: 'आपका कुल', jobRecords: 'आपके काम', openReceipt: 'निर्णय रसीद खोलें', cancelJob: 'काम रद्द करें', liveWork: 'मौजूदा काम', bookedScope: 'बुक किया गया काम', estimatedCosts: 'तय अनुमानित लागत', estimatedNet: 'अनुमानित शुद्ध कमाई', declineSafe: 'बिना रैंक दंड के मना करें', noOffers: 'अभी कोई काम नहीं है। नया प्रस्ताव यहाँ दिखेगा।', settledWallet: 'निपटाया स्थानीय वॉलेट', workload: 'मेरी काम सीमा', howItWorks: 'कामसभा कैसे काम करता है', completed: 'पूरा', offered: 'प्रस्तावित', travelling: 'रास्ते में', arrival: 'पहुँच गए', working: 'काम जारी', verification: 'सत्यापन चाहिए', cancelled: 'रद्द',
    bookingSub: 'आपका अनुरोध तुरंत सक्रिय संविधान के अनुसार चलता है।', actingWorker: 'कामगार-सदस्य के रूप में', workerWork: 'का काम', workerSub: 'प्रस्ताव, कमाई और कारण एक ही साझा रिकॉर्ड से आते हैं।', thisWeek: 'इस सप्ताह', estimatedLivelihood: 'अनुमानित शुद्ध आजीविका', validOpportunities: 'मान्य अवसर', jobsAccepted: 'स्वीकार किए काम', completedWorkNet: 'पूरे काम की शुद्ध कमाई', dividends: 'सहकारी लाभांश', penalties: 'दंड और उपाय', travelProtection: 'यात्रा सुरक्षा', fairAccessHelp: 'कामसभा कमाई और मिले वास्तविक काम के अवसर, दोनों देखता है। मना करने पर आपकी रैंक कम नहीं होती।', roadRoute: 'सड़क मार्ग', approximatePath: 'अनुमानित सेवा मार्ग', memberArrived: 'सदस्य पहुँच गए', simulatedTravel: 'डेमो की यात्रा सिमुलेट की गई है। ग्राहक और कामगार एक ही सहेजी प्रगति देखते हैं।',
  },
  mr: {
    appName: 'कामसभा', roleCustomer: 'ग्राहक', roleWorker: 'कामगार-सदस्य', roleOperations: 'सहकारी संचालन', judgeDemo: 'परीक्षक डेमो', language: 'भाषा',
    bookHelp: 'तुम्हाला कोणत्या कामासाठी मदत हवी आहे?', createJob: 'काम नोंदवा आणि सदस्य निवडा', fairWork: 'न्याय्य काम', fairWorkHelp: 'कामाच्या संधी कशा वाटल्या जातात ते पाहा आणि चुकीच्या निर्णयाला आव्हान द्या.',
    today: 'आज', jobs: 'कामे', earnings: 'कमाई', more: 'अधिक', acceptOffer: 'काम स्वीकारा', startTravel: 'प्रवास सुरू करा', arrived: 'मी पोहोचलो/पोहोचले',
    requestStartCode: 'काम सुरू करण्याचा कोड मागा', verifyStartCode: 'कोड तपासा आणि काम सुरू करा', requestCompletionCode: 'काम पूर्ण करण्याचा कोड मागा', verifyCompletionCode: 'कोड तपासा आणि काम पूर्ण करा',
    startCode: 'सुरुवात कोड', completionCode: 'पूर्णता कोड', evidence: 'कामाचा पुरावा', currentRule: 'सध्याचा नियम', challenges: 'आव्हाने', votes: 'मतदान', opportunities: 'माझ्या संधी', whyDecision: 'हा निर्णय का', activePolicy: 'सक्रिय संविधान', demoAccess: 'डेमो भूमिका प्रवेश', offlineMode: 'ऑफलाइन डेमो मोड', connectionReady: 'उपकरणावरील नोंदी तयार आहेत',
    newRequest: 'नवीन सेवा विनंती', service: 'सेवा', locality: 'परिसर', schedule: '7 सप्टेंबरची वेळ', describe: 'सदस्याला कामाबद्दल काय माहिती असावी?', aiHelp: 'समस्या लिहिण्यास मदत घ्या', referencePhoto: 'संदर्भ फोटो जोडा', emergency: 'तातडीची विनंती', workerPay: 'कामगार सेवा मोबदला', welfare: 'कल्याण योगदान', operationsShare: 'सहकारी संचालन', customerTotal: 'तुमची एकूण रक्कम', jobRecords: 'तुमची कामे', openReceipt: 'निर्णय पावती उघडा', cancelJob: 'काम रद्द करा', liveWork: 'सध्याचे काम', bookedScope: 'ठरलेले काम', estimatedCosts: 'निश्चित अंदाजित खर्च', estimatedNet: 'अंदाजित निव्वळ कमाई', declineSafe: 'क्रमवारी दंडाशिवाय नकार द्या', noOffers: 'सध्या कोणतेही काम नाही. नवीन प्रस्ताव येथे दिसेल.', settledWallet: 'निकाली स्थानिक पाकीट', workload: 'माझी काम मर्यादा', howItWorks: 'कामसभा कसे काम करते', completed: 'पूर्ण', offered: 'प्रस्तावित', travelling: 'प्रवासात', arrival: 'पोहोचले', working: 'काम सुरू', verification: 'पडताळणी हवी', cancelled: 'रद्द',
    bookingSub: 'तुमची विनंती लगेच सक्रिय संविधानानुसार चालते.', actingWorker: 'कामगार-सदस्य म्हणून', workerWork: 'यांचे काम', workerSub: 'प्रस्ताव, कमाई आणि कारणे एकाच सामायिक नोंदीतून येतात.', thisWeek: 'या आठवड्यात', estimatedLivelihood: 'अंदाजित निव्वळ उपजीविका', validOpportunities: 'वैध संधी', jobsAccepted: 'स्वीकारलेली कामे', completedWorkNet: 'पूर्ण कामाची निव्वळ कमाई', dividends: 'सहकारी लाभांश', penalties: 'दंड आणि उपाय', travelProtection: 'प्रवास संरक्षण', fairAccessHelp: 'कामसभा कमाई आणि मिळालेल्या खऱ्या कामाच्या संधी, दोन्ही पाहते. नकार दिल्याने क्रमवारी कमी होत नाही.', roadRoute: 'रस्ता मार्ग', approximatePath: 'अंदाजित सेवा मार्ग', memberArrived: 'सदस्य पोहोचले', simulatedTravel: 'डेमोसाठी प्रवास अनुकरण केलेला आहे. ग्राहक आणि कामगार एकच जतन केलेली प्रगती पाहतात.',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
export function translate(locale: Locale, key: MessageKey) {
  return messages[locale][key] ?? messages.en[key];
}
export const localeOptions: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'mr', label: 'मराठी' },
];

const serviceNames: Record<Locale, Record<string, string>> = {
  en: { Electrician: 'Electrician', Plumber: 'Plumber', 'Home cleaning': 'Home cleaning', 'Appliance repair': 'Appliance repair', Caregiving: 'Caregiving' },
  hi: { Electrician: 'इलेक्ट्रीशियन', Plumber: 'प्लंबर', 'Home cleaning': 'घर की सफ़ाई', 'Appliance repair': 'उपकरण मरम्मत', Caregiving: 'देखभाल सेवा' },
  mr: { Electrician: 'इलेक्ट्रिशियन', Plumber: 'प्लंबर', 'Home cleaning': 'घर स्वच्छता', 'Appliance repair': 'उपकरण दुरुस्ती', Caregiving: 'देखभाल सेवा' },
};
export function serviceLabel(locale: Locale, service: string) {
  return serviceNames[locale][service] ?? service;
}
