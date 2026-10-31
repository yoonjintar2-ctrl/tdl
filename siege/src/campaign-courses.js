export const CAMPAIGN_REWARD_RATE=.2;
const rows=[
 ['첫 개장, 첫 방어',10,'입문','완만한 등락 속에서 타워와 장벽을 익히세요.',[0,.3,-.8,.5,1.5],'machine'],
 ['초록빛 오후',10,'상승장','양봉의 보급을 받아 탄탄한 전선을 만드세요.',[0,1,2.5,1.5,4],'bull-candle'],
 ['내 첫 폭락의 날',12,'하락장','거센 음봉의 물결을 처음으로 버텨내세요.',[0,-1,-4,-6,-3],'enemy-small'],
 ['흔들리는 박스권',12,'횡보장','오르내리는 성벽에 맞춰 배치를 바꾸세요.',[0,2,-2,2,-1,1],'sniper'],
 ['첫 번째 V자 반등',15,'V자 반등','깊어진 낙폭 뒤에 올라오는 지원군을 맞이하세요.',[0,-3,-8,-4,2,5],'supply-wafer'],
 ['불타는 반도체',15,'강한 상승','반도체 친구들의 보급 행렬을 지켜내세요.',[0,3,6,4,9,11],'supply-processor'],
 ['가짜 반등의 덫',15,'반등 후 하락','잠깐의 초록빛 뒤에 두 번째 매도가 밀려옵니다.',[0,-4,1,-6,-10,-5],'enemy-tall'],
 ['두 번의 바닥',18,'W자 반등','두 차례 저점을 통과해 마지막 회복을 기다리세요.',[0,-6,-1,-7,0,4],'sticky'],
 ['갭 하락의 아침',18,'갭 하락','낮아진 출발선에서 시작하는 긴 방어전입니다.',[-6,-9,-5,-8,-3,0],'mortar'],
 ['붉은 월요일',20,'패닉셀','연속된 매도 물결 속에서 화력을 집중하세요.',[0,-5,-12,-17,-10,-6],'enemy-fat'],
 ['상승장의 숨 고르기',20,'조정 후 상승','상승 중간의 큰 조정을 넘어서세요.',[0,6,10,3,8,13],'supply-dram'],
 ['급등 뒤의 그림자',20,'급등·급락','높아진 성벽이 빠르게 물러나는 장세입니다.',[0,9,16,7,-3,-7],'laser'],
 ['거인의 투매',22,'대량 매도','큰 음봉이 섞인 굵은 군집을 막아내세요.',[0,-4,-11,-18,-13,-8],'enemy-giant'],
 ['역전의 종',22,'장중 역전','한동안 밀리던 전선이 마지막에 뒤집힙니다.',[0,-8,-12,-5,3,10],'supply-optical'],
 ['세 번의 파도',25,'연속 변동','상승과 하락이 반복되는 긴 호흡의 전장입니다.',[0,7,-6,9,-8,10,2],'poison'],
 ['바닥 없는 것 같던 날',25,'깊은 하락','긴 투매 뒤에 찾아오는 작은 반등을 지키세요.',[0,-8,-16,-23,-18,-11],'enemy-giant'],
 ['기적 같은 V',25,'급락·급반등','깊은 바닥에서 강하게 되돌아오는 지원군입니다.',[0,-10,-22,-12,3,14],'bull-candle'],
 ['과열 경보',28,'과열 후 조정','쏟아지는 보급과 갑작스러운 매도에 대응하세요.',[0,12,22,10,18,6],'totem'],
 ['폭풍의 전야',28,'복합 장세','조용한 출발 뒤에 강한 변동이 연이어 찾아옵니다.',[0,1,-3,12,-19,-8,7],'drone'],
 ['마지막 종이 울릴 때',30,'최종 전장','폭락·반등·조정이 이어지는 마지막 코스입니다.',[0,8,-13,5,-24,-6,15,-8,9],'mortar']
];
export const COURSES=rows.map(([title,minutes,concept,description,anchors,art],index)=>Object.freeze({id:index+1,title,minutes,duration:minutes*60,concept,description,anchors:Object.freeze(anchors),art,symbol:'SOXL',activity:.3+index*.065,bonusGold:minutes*30,bonusXP:minutes*3}));
// v37: the endless battlefield, unlocked after all 20 courses. A long seeded random walk whose volume keeps rising.
const walk=(()=>{let v=0,seed=7;const out=[0];for(let i=0;i<360;i++){seed=(seed*16807)%2147483647;const r=seed/2147483647-.5;v=Math.max(-24,Math.min(24,v*.92+r*9));out.push(Math.round(v*10)/10);}return Object.freeze(out);})();
export const INFINITE=Object.freeze({id:21,infinite:true,title:'인피니티 전장',minutes:360,duration:360*60,concept:'끝없는 전장',description:'시간이 갈수록 거세지는 끝없는 장세. 성벽이 무너질 때까지 버티세요.',anchors:walk,art:'enemy-giant',symbol:'SOXL',activity:.9,bonusGold:0,bonusXP:0});
export const infiniteActivity=minute=>Math.min(4.5,.9+minute*.035);
export const courseFor=id=>Number(id)===21?INFINITE:COURSES.find(c=>c.id===Number(id));
export function campaignProgress(raw){const cleared=Math.max(0,Math.min(20,Math.floor(Number(raw?.cleared)||0))),settled=Array.isArray(raw?.settled)?raw.settled.filter(v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(v)).slice(-64):[];return{cleared,settled};}
export const courseUnlocked=(progress,id)=>!!courseFor(id)&&Number(id)<=campaignProgress(progress).cleared+1;
export function courseChange(course,seconds){const t=Math.max(0,Math.min(1,seconds/course.duration)),p=t*(course.anchors.length-1),i=Math.min(course.anchors.length-2,Math.floor(p)),u=p-i,s=u*u*(3-2*u),base=course.anchors[i]+(course.anchors[i+1]-course.anchors[i])*s;return Math.max(-28,Math.min(28,base+Math.sin(seconds*.13+course.id)*Math.sin(Math.PI*t)*.09));}
export const courseTime=seconds=>`${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,seconds)%60).toString().padStart(2,'0')}`;
