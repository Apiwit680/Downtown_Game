/* Catalog views share the server's action availability; disabled rows explain why. */
window.DowntownLifeUI = {
  render({state,content,location,player,el,button,action,busy,money,amount,art}) {
    const life=state.catalog.life;
    const available=(type,payload)=>state.actions.find(a=>a.type===type&&JSON.stringify(a.payload)===JSON.stringify(payload));
    const command=(label,type,payload)=>{const b=button(label,'action-button',()=>action(type,payload),busy||!available(type,payload));b.dataset.action=type;return b;};
    const group=(title)=>{const d=el('details','catalog-group');d.open=true;d.append(el('summary','',title));content.append(d);return d;};
    const stats=effect=>Object.entries(effect).map(([k,v])=>({health:'สุขภาพ',happiness:'ความสุข',experience:'ประสบการณ์'}[k]||k)+' '+(v>0?'+':'')+v).join(' · ');
    const vocational=player.education.universityEntryTrack==='vocational'||player.education.track==='vocational'||['vocational','diploma'].includes(player.education.level);
    const degreeCredits=degree=>life.degrees[degree].credits*(degree==='bachelor'&&vocational?0.5:1);
    const offerPay=job=>{const row=el('div','offer-pay');row.append(el('p','',`Workday pay: ฿${amount(job.payByPhase.workday)}`),el('p','',`Weekend pay: ฿${amount(job.payByPhase.weekend)}`),el('small','','ต่อการทำงาน 1 AP'));return row;};
    if(location.id==='school'){
      const education=player.education,stage=education.level==='m3'?education.track:education.level==='vocational'?'diploma':null;
      const section=group('ความคืบหน้าการเรียน'),steps=state.catalog.study.credits[stage];
      section.append(el('p','study-progress',steps?`Step ${Math.min(education.credits,steps)} of ${steps} · ${stage}`:education.level==='m3'?'เลือกสายก่อนกด Study':'สำเร็จขั้นนี้แล้ว · ปิดหน้าต่างด้วย × เมื่อพร้อม'));
    }
    if(location.id==='bank'){
      const section=group('ชำระหนี้'),form=el('form','repayment-form'),label=el('label','','จำนวนเงินชำระ · หนี้คงเหลือ '+money(player.debt)),input=el('input');input.type='number';input.min='1';input.max=String(player.debt);input.step='1';input.required=true;input.name='repayment';input.setAttribute('aria-label','จำนวนเงินชำระหนี้');input.value=String(Math.min(player.debt,player.cash)||'');
      const submit=button('ชำระตามจำนวนที่กรอก · 1 AP','action-button',()=>{},busy||!state.actions.some(a=>a.type==='bank'&&a.payload.operation==='repay'));submit.type='submit';form.append(label,input,submit);form.addEventListener('submit',e=>{e.preventDefault();const value=Number(input.value);if(form.reportValidity()&&Number.isSafeInteger(value)&&value>=1&&value<=player.debt&&value<=player.cash)action('bank',{operation:'repay',amount:value});else {input.setCustomValidity('จำนวนเต็ม 1 ถึงยอดหนี้ และไม่เกินเงินสดที่มี');input.reportValidity();}});input.addEventListener('input',()=>input.setCustomValidity(''));section.append(form);
    }
    if(location.id==='job_center'){
      for(const workplace of state.map.locations){const jobs=state.catalog.careers.filter(j=>j.locationId===workplace.id);if(!jobs.length)continue;const section=group(workplace.name);
        for(const kind of ['parttime','main']){const list=jobs.filter(j=>j.kind===kind);if(!list.length)continue;section.append(el('h4','',kind==='main'?'Full time · Resume':'Part time'));
          for(const job of list){const row=el('div','catalog-item');row.dataset.job=job.id;row.append(el('strong','',job.name),el('small','',`${job.requiredEducation}${job.requiredFaculty?' · '+job.requiredFaculty:''} · ประสบการณ์ ${job.requiredExperience}`),el('small','',`Workday ${money(job.payByPhase.workday)} / Weekend ${money(job.payByPhase.weekend)} ต่อ 1 AP`));
            const pending=state.applications.some(a=>a.jobId===job.id),offer=state.offers.includes(job.id);
            if(offer)row.append(offerPay(job));row.append(command(pending?'รอผล Turn ถัดไป':offer?'รับข้อเสนองาน':kind==='main'?'ส่ง Resume':'สมัครพาร์ตไทม์',offer?'accept_job':'apply_job',{jobId:job.id}));
            if(!available('apply_job',{jobId:job.id})&&!offer&&!pending)row.append(el('small','','ตรวจวุฒิ ประสบการณ์ งานที่ถืออยู่ และ AP'));section.append(row);
          }
        }
      }
    }
    if(location.id==='university'){
      const section=group('เส้นทางการศึกษา'),ranks=['bachelor','master','doctorate'],names={bachelor:'ปริญญาตรี',master:'ปริญญาโท',doctorate:'ปริญญาเอก'};
      for(const faculty of life.faculties){const branch=el('div','education-branch');branch.dataset.faculty=faculty.id;branch.append(el('h4','',faculty.name));const path=el('div','education-path');
        if(vocational&&faculty.id!=='engineering')continue;
        ranks.forEach((degree,index)=>{const finished=ranks.indexOf(player.education.degrees[faculty.id])>=index,credits=player.education.progress[faculty.id+':'+degree]||0,rule=life.degrees[degree];const cell=el('div','degree-node'+(finished?' completed':''));cell.append(el('strong','',names[degree]),el('small','study-progress',finished?'สำเร็จแล้ว':`Step ${credits} of ${degreeCredits(degree)} · ${money(rule.tuition)}/ครั้ง`),command('เรียน · 1 AP','study_degree',{facultyId:faculty.id,degree}));if(index)path.append(el('span','degree-arrow','↓'));path.append(cell);});branch.append(path);section.append(branch);
      }
      section.append(el('small','',vocational?'ปวส. ต่อได้เฉพาะวิศวกรรม · ปริญญาตรี 12 ครั้ง (ครึ่งหนึ่งของสายสามัญ)':'ปริญญาตรี 24 ครั้ง · ปริญญาโท/เอกต้องมีวุฒิคณะเดียวกัน · เรียนปริญญาตรีหลายคณะได้'));
    }
    const foods=life.foods.filter(f=>f.locationId===location.id);
    for(const category of [...new Set(foods.map(f=>f.category))]){const section=group(category);
      for(const food of foods.filter(f=>f.category===category)){const row=el('div','catalog-item');row.dataset.food=food.id;row.append(el('strong','',food.name),el('small','',money(food.price)+' · '+(food.raw?'วัตถุดิบสำหรับครัว':stats(food.effect))));if(food.raw||location.id!=='convenience'||player.equipment.includes('fridge'))row.append(command('ซื้อเก็บไว้'+(food.raw?'':` · ${life.purchaseAp} AP`),'buy_food',{foodId:food.id}));if(!food.raw)row.append(command(`ซื้อแล้วกิน · ${(food.eatAp??life.eatAp)+life.purchaseAp} AP`,'buy_eat',{foodId:food.id}));if(location.id==='convenience'&&!food.raw&&!player.equipment.includes('fridge'))row.append(el('small','','มีตู้เย็นแล้วจึงเลือกซื้อเก็บไว้ได้'));section.append(row);}
    }
    if(location.id==='mall')for(const category of [...new Set(life.items.map(i=>i.category))]){const section=group(category);for(const item of life.items.filter(i=>i.category===category)){const row=el('div','catalog-item');row.dataset.item=item.id;row.append(el('strong','',item.name),el('small','',money(item.price)+' · '+(stats(item.effect)||'ติดตั้งที่พัก')),command(player.equipment.includes(item.id)?'มีแล้ว':'ซื้อ · 1 AP','buy_item',{itemId:item.id}));section.append(row);}}
    if(location.id==='home'){
      const room=group('ที่พักและเครื่องใช้'),installed=el('div','installed-appliances');installed.innerHTML=art.appliances(player.equipment);room.append(installed);
      const kitchen=group('ครัว');for(const recipe of state.recipes){const row=el('div','recipe'+(!recipe.craftable?' unavailable':''));row.dataset.recipe=recipe.id;row.append(el('strong','',recipe.name),el('small','',Object.entries(recipe.ingredients).map(([id,n])=>life.foods.find(f=>f.id===id).name+' ×'+n).join(' · ')),el('small','',recipe.craftable?'พร้อมทำ · '+recipe.portions+' ที่':('ขาด: '+recipe.missing.join(', '))),command('ทำอาหาร · '+life.cookAp+' AP','cook',{recipeId:recipe.id}));kitchen.append(row);}
      const inventory=group('ของที่เก็บไว้');for(const[id,n]of Object.entries(state.inventory)){if(!n)continue;const item=life.foods.find(f=>f.id===id)||life.recipes.find(f=>f.id===id);inventory.append(el('p','',item.name+' ×'+n));}
    }
    const stored=state.actions.filter(a=>a.type==='eat_food');if(stored.length){const section=group('อาหารพร้อมกิน');for(const a of stored)section.append(command(a.label,a.type,a.payload));}
    if(location.id==='black_market'){
      const section=group('ตลาดมืด · ย่อยการ์ด');section.append(el('p','warning','ทุกครั้งที่เข้า: สุขภาพและความสุขลดอย่างละ 10–30 แม้ไม่ใช้บริการ · เสี่ยงถูกจับในการย่อย · ย่อยได้ 3 ครั้งต่อ Phase · ต้องมีที่ว่างอย่างน้อย 0.5 AP จากเพดาน 24'));
      const chosen=new Set(),controls=el('div','salvage-options');
      const doSalvage=button('ย่อยการ์ดที่เลือก','action-button',()=>action('salvage',{indices:[...chosen].sort((a,b)=>a-b)}),true);
      state.hand.forEach((card,index)=>{const label=el('label','salvage-option'),check=el('input');check.type='checkbox';check.dataset.index=index;check.addEventListener('change',()=>{check.checked?chosen.add(index):chosen.delete(index);const payload={indices:[...chosen].sort((a,b)=>a-b)};doSalvage.disabled=busy||!available('salvage',payload);doSalvage.textContent=chosen.size===3?'ย่อย 3 ใบ · +0.5 AP และเงินเล็กน้อย':'ย่อย 1 ใบ · +0.5 AP';});label.append(check,el('span','',card.name));controls.append(label);});section.append(controls,doSalvage);
    }
    for(const jobId of state.offers){const job=state.catalog.careers.find(j=>j.id===jobId),row=el('div','job-offer');row.append(el('h3','',job.name),offerPay(job),command('รับงาน '+job.name,'accept_job',{jobId}));content.append(row);}
  }
};
