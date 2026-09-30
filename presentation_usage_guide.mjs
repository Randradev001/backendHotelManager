import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const workspaceDir='C:/Proyectos2025/HotelManager/backendAperpBodega';
const SKILL_DIR='C:/Users/andre/.codex/plugins/cache/openai-primary-runtime/presentations/26.903.11726/skills/presentations';
const TMP_DIR=path.join(workspaceDir,'.codex-ppt-usage');
const FINAL_PPTX=path.join(workspaceDir,'outputs','hm-taskmanager-simple-user-guide-final.pptx');
const RUNTIME_PYTHON='C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const SHOTS=path.join(workspaceDir,'outputs','real-ui-captures');
const currentBoard='C:/Users/andre/AppData/Local/Temp/codex-clipboard-c3e3ad3a-40da-4cbe-be3c-b2b2c8c98c91.png';
const W=1280,H=720;
const C={navy:'#102D50',blue:'#087DF1',teal:'#118E9E',ink:'#10233D',muted:'#5F6F82',light:'#F4F7FB',line:'#D6E0EC',white:'#FFFFFF',green:'#2E7D32',amber:'#E49B21'};

const { resolvePresentationFont, finalizePresentation }=await import(pathToFileURL(path.join(SKILL_DIR,'container_tools/artifact_tool_utils.mjs')).href);
const font=resolvePresentationFont();
async function blob(file){const b=await fs.readFile(file);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
function rect(slide,x,y,w,h,fill=C.white,line=C.line){return slide.shapes.add({geometry:'roundRect',position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:line,width:1},borderRadius:'rounded-xl'});}
function txt(slide,value,x,y,w,h,size=20,color=C.ink,bold=false,align='left'){const t=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});t.text=value;t.text.style={typeface:font,fontSize:size,color,bold,alignment:align,verticalAlignment:'middle',autoFit:'shrinkText'};return t;}
function heading(slide,title,subtitle,number){txt(slide,title,64,38,1040,48,34,C.navy,true);txt(slide,subtitle,64,91,1080,34,18,C.muted);txt(slide,String(number).padStart(2,'0'),1182,43,35,26,14,C.blue,true,'right');}
function footer(slide){txt(slide,'HM TaskManager · Simple User Guide',64,685,400,16,11,C.muted);}
function image(slide,data,x,y,w,h,fit='contain'){rect(slide,x-3,y-3,w+6,h+6,C.white,C.line);slide.images.add({blob:data,contentType:'image/png',position:{left:x,top:y,width:w,height:h},fit,geometry:'roundRect',borderRadius:'rounded-xl'});}
function step(slide,n,title,body,x,y,w){txt(slide,String(n),x,y,38,38,19,C.white,true,'center').fill=C.blue;txt(slide,title,x+54,y,w-54,30,20,C.navy,true);txt(slide,body,x+54,y+33,w-54,55,16,C.muted);}
function stepDark(slide,n,title,body,x,y,w){txt(slide,String(n),x,y,38,38,19,C.white,true,'center').fill=C.blue;txt(slide,title,x+54,y,w-54,30,20,C.white,true);txt(slide,body,x+54,y+33,w-54,55,16,'#C8D9EA');}

await fs.mkdir(TMP_DIR,{recursive:true});await fs.mkdir(path.dirname(FINAL_PPTX),{recursive:true});
const p=Presentation.create({slideSize:{width:W,height:H}});
const login=await blob(path.join(SHOTS,'login.png')), dashboard=await blob(path.join(SHOTS,'dashboard.png')), orders=await blob(path.join(SHOTS,'work-orders.png')), board=await blob(currentBoard), locations=await blob(path.join(SHOTS,'locations.png')), categories=await blob(path.join(SHOTS,'maintenance-categories.png')), assets=await blob(path.join(SHOTS,'assets.png'));

let s=p.slides.add();s.background.fill=C.navy;txt(s,'HM TASKMANAGER',70,62,420,28,16,'#7FE4DE',true);txt(s,'Simple User Guide',70,125,560,70,49,C.white,true);txt(s,'Hotel maintenance operations',70,205,520,36,24,'#D7E7F7');txt(s,'Login, review work, manage tasks and track progress across authorized hotels.',70,285,500,100,21,C.white);txt(s,'Prepared for hotel managers and maintenance teams',70,570,510,28,16,'#B9CDE3');image(s,login,700,55,510,610,'cover');

s=p.slides.add();s.background.fill=C.light;heading(s,'Secure access','Sign in with email and select the hotel context when prompted.',2);image(s,login,64,155,650,470,'contain');step(s,1,'Enter your email','Use the email assigned by the system administrator.',760,190,430);step(s,2,'Enter your password','Temporary passwords should be changed after first access.',760,305,430);step(s,3,'Confirm the hotel','Users see only their authorized hotels. Administrators can view the full portfolio.',760,420,430);footer(s);

s=p.slides.add();s.background.fill=C.light;heading(s,'Management dashboard','The opening screen summarizes workload, risk and service performance.',3);image(s,dashboard,54,145,765,500,'contain');txt(s,'Read this screen first',860,165,330,32,23,C.navy,true);txt(s,'Active backlog shows unfinished work.\n\nOverdue identifies orders past their expected completion date.\n\nOn-time completion and resolution time show service performance.\n\nUse the user filter to review an individual workload.',860,220,330,300,18,C.ink);rect(s,860,545,330,62,'#E8F5F4','#B8E1DE');txt(s,'The conclusion highlights the action that needs management attention.',882,557,285,38,16,C.teal,true);footer(s);

s=p.slides.add();s.background.fill=C.light;heading(s,'Work order register','Search, filter and manage every maintenance request from one list.',4);image(s,orders,54,150,750,475,'contain');step(s,1,'Create','Select New Work Order and enter title, location, priority, dates and tasks.',845,170,365);step(s,2,'Review','Use the eye icon for details. Administrators can filter by hotel.',845,285,365);step(s,3,'Update','Edit the order, manage tasks or open Change Status from the action icons.',845,400,365);step(s,4,'Track dates','Red dates identify overdue work that still needs attention.',845,515,365);footer(s);

s=p.slides.add();s.background.fill=C.light;heading(s,'Tasks and status rules','Each work order contains the specific tasks required to finish the job.',5);rect(s,64,155,530,450,C.white,C.line);txt(s,'Task controls',98,185,420,32,24,C.navy,true);txt(s,'Each task has a status and an optional responsible worker.\n\nTO DO means work has not started.\n\nIN PROGRESS identifies active work.\n\nCOMPLETED closes the task.\n\nCANCELLED records work removed from scope.',98,240,430,275,18,C.ink);rect(s,98,520,420,55,'#FFF5DB','#F1D58A');txt(s,'A work order can finish only when every task is COMPLETED.',115,529,385,36,16,'#8B5A00',true);rect(s,650,155,540,450,C.navy,C.navy);txt(s,'Header workflow',690,190,420,34,25,C.white,true);txt(s,'NEW\n\nASSIGNED\n\nIN PROGRESS\n\nON HOLD\n\nCOMPLETED or CANCELLED',690,250,210,285,22,'#DCEBFA',true);txt(s,'Assignment selects the worker.\n\nStarting work requires at least one open task.\n\nOn Hold requires a reason.\n\nCompletion requires a comment and all tasks completed.',930,250,220,285,17,C.white);footer(s);

s=p.slides.add();s.background.fill=C.light;heading(s,'Work Board','The board provides a visual view of work by status and hotel.',6);image(s,board,45,145,790,500,'contain');txt(s,'Daily use',875,165,300,32,23,C.navy,true);txt(s,'Filter by hotel when working as an administrator.\n\nDrag a card to the next valid status.\n\nClick a card to update its tasks and responsible workers.\n\nThe card displays pending tasks, total tasks and completion percentage.\n\nCard colour matches the status lane.',875,220,300,330,18,C.ink);footer(s);

s=p.slides.add();s.background.fill=C.light;heading(s,'Locations and categories','Master records keep work orders consistent and easy to report.',7);image(s,locations,55,165,565,390,'contain');image(s,categories,660,165,565,390,'contain');txt(s,'Locations',55,585,220,28,21,C.navy,true);txt(s,'Buildings, floors, rooms and operational areas.',55,615,500,32,16,C.muted);txt(s,'Maintenance categories',660,585,300,28,21,C.navy,true);txt(s,'Standard work types with default priority and colour.',660,615,500,32,16,C.muted);footer(s);

s=p.slides.add();s.background.fill=C.light;heading(s,'Assets','Assets connect maintenance history to hotel equipment.',8);image(s,assets,55,155,745,480,'contain');txt(s,'Asset records include',850,180,320,30,23,C.navy,true);txt(s,'Asset tag and name\n\nHotel location\n\nMaintenance category\n\nManufacturer and model\n\nOperational status',850,235,300,275,19,C.ink);rect(s,850,535,320,66,'#E7F5FA','#B8DFE8');txt(s,'Linking work orders to assets helps identify repeat failures.',870,546,280,44,16,C.teal,true);footer(s);

s=p.slides.add();s.background.fill=C.navy;txt(s,'Daily operating routine',70,55,750,52,38,C.white,true);txt(s,'A simple sequence for managers and technicians',70,112,650,30,19,'#B9CDE3');stepDark(s,1,'Review the dashboard','Check backlog, overdue work and the management conclusion.',90,200,500);stepDark(s,2,'Open Work Orders','Create new requests and confirm location, dates and task scope.',670,200,500);stepDark(s,3,'Assign and start','Select the worker, keep at least one task open and move work to IN PROGRESS.',90,355,500);stepDark(s,4,'Update tasks','Record progress from the list or by clicking the card in Work Board.',670,355,500);stepDark(s,5,'Complete the order','Complete every task, add the completion comment and close the work order.',380,515,520);txt(s,'HM TaskManager',70,675,250,18,12,'#B9CDE3');

const candidatePath=path.join(TMP_DIR,'candidate.pptx');await (await PresentationFile.exportPptx(p)).save(candidatePath);
await finalizePresentation({workspaceDir,candidatePath,finalPath:FINAL_PPTX,pythonExecutable:RUNTIME_PYTHON,integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],requiredNativeTableOwnerSlides:[],fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(TMP_DIR,'validation-final.json')});
console.log(FINAL_PPTX);
