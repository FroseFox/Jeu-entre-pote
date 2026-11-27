using System;
using System.Collections.Generic;
using UnityEngine;

public sealed partial class RoundGame : MonoBehaviour
{
    public Rules rules;
    public Transform rotor, door, balloon;
    public Camera view;
    public ArrivalVehicle vehicle;
    public GameObject[] sites;
    public Visitor visitorPrefab;
    public StreetCrowd crowd;
    public AudioSource speaker;
    [Serializable] public class Run {
        public double cash, admitted, earned, waiting, energy, seconds, departures, allTime, trust;
        public int[] levels=new int[9], perks=new int[22], routes=new int[3];
        public bool[] contracts=new bool[3];
        public int branch, runs, serial, tickets, combo, crowdSize, eventIndex;
        public float angle,speed,part,waveClock,eventClock,balloonClock,balloonAge=-1, rush,festival,repair,comboClock,drawClock,gulp,charge,adminClock,zoom=1;
        public float[] routeClocks=new float[3];
        public bool muted=true,paused,manualZoom;
        public Visitor.Record[] actors;
        public StreetCrowd.Batch[] batches;
    }
    Vector3 cameraTarget;
    float cameraDistance, initialZoomSize, lastOpeningScale;
    int previousWidth, previousHeight;
    public GameObject gallery, stairCovers;
    public Transform[] barrierRuns;
    public GameObject[] flywheelParts;
    BladeProfile[] blades;
    bool HasGallery => L(4) > 0 || L(8) > 0;
    readonly double[] minuteAdmissions = new double[60];
    double perMinute;
    int rateSecond;
    void ClearMeter()
    {
        Array.Clear(minuteAdmissions, 0, minuteAdmissions.Length);
        rateSecond = (int)s.seconds;
        perMinute = 0;
        noticeClock = 0;
        Array.Clear(pulses, 0, pulses.Length);
    }
    void AdvanceMeter()
    {
        int now = (int)s.seconds;
        while (rateSecond < now) {
            int bucket = ++rateSecond % minuteAdmissions.Length;
            perMinute -= minuteAdmissions[bucket];
            minuteAdmissions[bucket] = 0;
        }
    }
    Run s=new Run();
    readonly List<Visitor> people=new List<Visitor>();
    readonly Stack<Visitor> pool=new Stack<Visitor>();
    float guestTimer;
    readonly int[] bladeCounts={4,4,4,6,10}, bladeSlots={1,2,4,6,10};
    readonly string[] branches={"Boutique de quartier","Bord de mer","Maison de luxe","Aéroport"};
    readonly string[] guests={"Coursier","Guide","Robot","Idole","Défilé","Chargement","Géant"};
    double lastIncome;
    float saveClock,displayClock,noticeClock,lastPointerAngle;
    bool drag;
    string notice="",panel="";
    AudioClip tickSound;

    int Perk(string id){int i=Array.FindIndex(rules.perks,p=>p.id==id);return i<0?0:s.perks[i];}
    int L(int i)=>s.levels[i];
    double Wave=>Math.Ceiling(Math.Pow(1.62,L(0))*(1+.75*L(8))*(1+.14*Perk("routes")));
    float Radius=>rules.initialRadius*(1+Mathf.Min(22,L(4))*.018f);
    int Blade=>Mathf.Clamp(L(5),0,4);
    readonly float[] seatBends={0,.27f,.61f,1.13f,.99f};
    float Top=>(8+Blade)*(Perk("license")>0?1.3f:1);
    const string AutoKey="RoundAndRound.Native.Current.v1";
    void Awake(){
        ReadAppearance();
        blades = rotor.GetComponentsInChildren<BladeProfile>(true);
        initialZoomSize = view.orthographicSize;
        cameraDistance=Vector3.Dot(door.position-view.transform.position,view.transform.forward);
        cameraTarget=view.transform.position+view.transform.forward*cameraDistance;
        var samples=new float[2646];
        for(int i=0;i<samples.Length;i++){float t=i/22050f;samples[i]=Mathf.Sin(t*2200)*Mathf.Exp(-t*43)*.16f;}
        tickSound=AudioClip.Create("Déclic",samples.Length,1,22050,false);tickSound.SetData(samples,0);
        if(!Load(AutoKey))RefreshScene();
    }
    void RefreshScene(){

        BuildDock();
        if(flywheelParts!=null)foreach(var piece in flywheelParts)
            if(piece)piece.SetActive(L(2)>0 || Blade>0);
        if(sites!=null)for(int i=0;i<sites.Length;i++)if(sites[i])sites[i].SetActive(i==s.branch);
        foreach (var wall in barrierRuns) {
            var p = wall.localPosition;
            p.x = Mathf.Sign(p.x) * (Radius + .01f);
            wall.localPosition = p;
        }
        if (gallery) gallery.SetActive(HasGallery);
        if (stairCovers) stairCovers.SetActive(!HasGallery);
        for (int i = 0; i < blades.Length; i++) {
            bool active = i < bladeCounts[Blade];
            var blade = blades[i];
            blade.gameObject.SetActive(active);
            if (!active) continue;
            blade.transform.localRotation = Quaternion.Euler(0, i * 360f / bladeCounts[Blade], 0);
            blade.Shape(Blade);
        }
        door.localScale=Vector3.one*(Radius/rules.initialRadius);
        rotor.localRotation=Quaternion.Euler(0,s.angle*Mathf.Rad2Deg,0);
        FrameCamera();balloon.gameObject.SetActive(s.balloonAge>=0);
        RefreshCrowd();
        crowd.TurnGroups(0,s.angle);
        Shader.SetGlobalFloat("_RRWalkPhase",(float)(s.seconds%1));
    }
    int ReservedVisitorCount()
    {
        int held=0;
        foreach(var p in people)if(p.HoldsPlace)held++;
        return held;
    }
    void RefreshCrowd()
    {
        int held=ReservedVisitorCount();
        double front,back;
        if(s.crowdSize>0) {
            int total=Math.Max(0,s.crowdSize-people.Count-crowd.PocketPeople);
            front=Math.Floor(total*.68);
            back=total-front;
        } else {
            front=Math.Max(0,s.waiting-held);
            back=Math.Max(0,s.departures-(people.Count-held)-crowd.PocketPeople);
            double limit=Math.Min(1,(2000000-people.Count-crowd.PocketPeople)/Math.Max(1,front+back));
            front*=limit;
            back*=limit;
        }
        crowd.SetCount((int)front,(int)back,Radius);
    }
    void Update(){
        if (previousWidth != Screen.width || previousHeight != Screen.height || Mathf.Abs(lastOpeningScale-OpeningScale)>.0005f) FrameCamera();
        if (Input.GetKeyDown(KeyCode.Escape)) {
            if (panel.Length > 0) { panel = ""; s.paused = false; }
            else Open("Pause");
            drag = false;
            return;
        }
        if (Input.GetKeyDown(KeyCode.P) && (panel == "" || panel == "Pause")) {
            s.paused = false;
            if (panel == "") Open("Pause"); else panel = "";
            return;
        }
        if(panel!=""||s.paused)return;
        float dt=Mathf.Min(.12f,Time.deltaTime);
        Vector3 m=Input.mousePosition;
        bool onStreet = StreetInput(m);
        for (int i = 0; i < DockCount; i++)
            if (Input.GetKeyDown((KeyCode)((int)KeyCode.Alpha1 + i))) Buy(dockIds[i]);
        if(Input.GetMouseButtonDown(0)&&onStreet){
            var bp=view.WorldToScreenPoint(balloon.position);
            if(s.balloonAge>=0&&Vector2.Distance(m,bp)<Mathf.Max(22,Screen.height*.045f)){Pop();return;}
            drag=true;lastPointerAngle=PointerAngle(m);Spin();
        }
        if(drag && !Input.GetMouseButton(0))drag=false;
        if(drag){float a=PointerAngle(m);float diff=Mathf.DeltaAngle(lastPointerAngle,a);lastPointerAngle=a;
            s.speed=Mathf.Clamp(s.speed+Mathf.Abs(diff)*.022f,0,Top);}
        if(Input.GetKeyDown(KeyCode.Space))Spin();
        float wheel=Input.mouseScrollDelta.y;if(onStreet&&wheel!=0)Zoom(wheel>0?1.25f:.8f);
        s.seconds+=dt;AdvanceMeter();s.waveClock+=dt;s.eventClock+=dt;s.balloonClock+=dt;s.drawClock+=dt;
        s.rush=Mathf.Max(0,s.rush-dt);s.festival=Mathf.Max(0,s.festival-dt);s.repair=Mathf.Max(0,s.repair-dt);s.gulp=Mathf.Max(0,s.gulp-dt);
        s.comboClock-=dt;if(s.comboClock<=0)s.combo=0;
        bool manual=Input.GetKey(KeyCode.Space)||drag;
        float motor=L(3)>0?Mathf.Min(.85f*Top,.63f+.39f*L(3)):0;
        float target=manual?Top*(.6f+.04f*Mathf.Min(10,L(1))):motor;
        if(s.repair>0)target*=1.5f;
        if(s.branch==1)target*=1+.13f*Mathf.Sin((float)s.seconds*.18f);
        s.speed=Mathf.Lerp(s.speed,target,1-Mathf.Exp(-dt*(manual?1.75f:.86f/(1+.27f*L(2)))));
        float da=s.speed*dt;
        if(manual&&Perk("gulp")>0){s.charge+=da/(2*Mathf.PI);if(s.charge>=8){s.gulp=25;s.charge=0;}}
        float interval=Mathf.Max(.23f,1.35f/(1+.16f*L(0)));
        if(s.waveClock>=interval){s.waveClock%=interval;Arrive(Wave*(s.rush>0?2:1));}
        vehicle.Step(dt);
        for(int i=0;i<3;i++)if(s.routes[i]>0){
            s.routeClocks[i]+=dt;float period=Mathf.Max(7,(i==0?22:i==1?35:48)*Mathf.Pow(.94f,s.routes[i]-1));
            if(s.routeClocks[i]>=period){s.routeClocks[i]%=period;vehicle.Dispatch(i);Arrive((i==0?8:i==1?25:62)*Math.Pow(1.65,s.routes[i]-1),s.branch==2&&i==2?"VIP":"Voyageur");}
        }
        if(Perk("delivery")>0&&(guestTimer+=dt)>=300){guestTimer=0;Arrive(1,"Chargement");}
        if(s.eventClock>=Mathf.Max(15,34-L(0))&&s.admitted>=25){s.eventClock=0;string kind=guests[s.eventIndex++%(Perk("giant")>0?7:6)];Arrive(kind=="Défilé"?6:1,kind);Tell(kind+" en approche");}
        if(L(0)>0&&s.balloonClock>=Mathf.Max(15,47-2*L(0))){s.balloonClock=0;s.balloonAge=0;balloon.gameObject.SetActive(true);}
        if(s.balloonAge>=0){s.balloonAge+=dt;PlaceBalloon();if(Perk("drone")>0&&s.balloonAge>6)Pop();else if(s.balloonAge>42)HideBalloon();}
        if(Perk("draw")>0&&s.drawClock>=240){s.drawClock%=240;s.tickets=Math.Min(3,s.tickets+1);}
        if(Perk("admin")>0&&(s.adminClock+=dt)>2){s.adminClock=0;int best=-1;for(int i=0;i<9;i++)if(CanBuy(i)&&(best<0||Price(i)<Price(best)))best=i;if(best>=0)Buy(best);}
        AdvanceTraffic(dt,da,manual);
        Shader.SetGlobalFloat("_RRWalkPhase",(float)(s.seconds%1));
        rotor.localRotation=Quaternion.Euler(0,s.angle*Mathf.Rad2Deg,0);
        s.departures*=Math.Exp(-dt/18);
        if((displayClock+=dt)>.18f){displayClock=0;RefreshCrowd();}
        noticeClock-=dt;if((saveClock+=dt)>4){saveClock=0;Save(AutoKey);}
    }
    void AdvanceTraffic(float dt,float turn,bool manual)
    {
        float arc=2*Mathf.PI/bladeCounts[Blade];
        float left=turn,seconds=dt;
        while(left>0 && s.part+left>=arc) {
            float step=Mathf.Clamp(arc-s.part,0,left);
            float slice=dt*step/turn;
            AdvancePeople(slice,step);
            left-=step;seconds-=slice;s.part=0;
            Admit(manual);
        }
        AdvancePeople(Mathf.Max(0,seconds),left);
        s.part+=left;
    }
    void AdvancePeople(float dt,float turn)
    {
        s.angle=Mathf.Repeat(s.angle+turn,Mathf.PI*2);
        crowd.TurnGroups(turn,s.angle);
        int front=0,back=0;
        for(int i=0;i<people.Count;) {
            var p=people[i];
            p.Step(dt,turn,p.InLine?front++:p.InReturnLine?back++:0,Radius,HasGallery);
            if(p.JustLanded)AddPulse(p.transform.position,null);
            if(p.Finished){p.gameObject.SetActive(false);pool.Push(p);people.RemoveAt(i);}else i++;
        }
    }
    float PointerAngle(Vector3 p){p-=view.WorldToScreenPoint(door.position);return Mathf.Atan2(p.y,p.x)*Mathf.Rad2Deg;}
    void Spin(){s.speed=Mathf.Min(Top,s.speed+1.55f*(1+.25f*L(1))*(1+.25f*Perk("force")));Sound(.7f);}
    float OpeningScale => s.manualZoom ? 1 : Mathf.Lerp(.80f,1,Mathf.SmoothStep(0,1,(float)(s.admitted/70)));
    void Zoom(float factor)
    {
        s.zoom=Mathf.Clamp(s.zoom*factor/OpeningScale,.01f,1.5f);
        s.manualZoom=true;
        FrameCamera();
    }
    void FrameCamera()
    {
        previousWidth=Screen.width; previousHeight=Screen.height;
        lastOpeningScale=OpeningScale;
        view.orthographicSize=initialZoomSize*lastOpeningScale*Mathf.Max(1,1.08f/Mathf.Max(.1f,view.aspect))/s.zoom;
        var forward=view.transform.forward;
        float distance=Mathf.Max(cameraDistance,view.orthographicSize*2.8f);
        view.transform.position=cameraTarget-forward*distance;
        // Keep enough depth for the plaza and the highest fling at either end of the view.
        float pitch=Mathf.Clamp(Mathf.Abs(forward.y),.1f,1);
        float depth=view.orthographicSize*Mathf.Sqrt(1-pitch*pitch)/pitch+8/pitch;
        view.nearClipPlane=Mathf.Max(.05f,distance-depth);
        view.farClipPlane=distance+depth;
    }
    void Sound(float pitch){if(!s.muted&&speaker){speaker.pitch=pitch;speaker.PlayOneShot(tickSound);}}
    void Tell(string text){notice=text;noticeClock=2.1f;}
    Visitor Make(){return pool.Count>0?pool.Pop():Instantiate(visitorPrefab);}
    void Arrive(double count,string role="Passant"){
        count=Math.Ceiling(count);s.waiting=Math.Min(1e13,s.waiting+count);
        int n=(int)Math.Min(count,Math.Min(8,rules.individualLimit-people.Count));
        for(int i=0;i<n;i++){
            var p=Make();p.Arrive(new Vector3(UnityEngine.Random.Range(-1.4f,1.4f),0,-Radius-1.8f-i*.26f),role,++s.serial);people.Add(p);
        }
    }
    float arcForCombo()=>Mathf.PI*2/bladeCounts[Blade];
    void Admit(bool manual){
        double capacity=Math.Max(1,Math.Floor((1+.68*L(4))*bladeSlots[Blade]*Math.Pow(2,Math.Min(40,L(7)))*(1+.35*Perk("capacity"))*(s.gulp>0?2:1)));
        int held=ReservedVisitorCount();
        double bulk=Math.Max(0,s.waiting-held);
        foreach(var visitor in people)
            if(visitor.InReturnLine && visitor.AtMouth(Radius))
                visitor.Board(false,Radius,s.angle,bladeCounts[Blade],seatBends[Blade],s.speed);
        if(s.waiting<1)return;
        int shown=0,bounced=0;double bonus=0;
        double fare=Math.Max(1,Math.Floor(3*Math.Pow(1.7,L(6))*(1+.22*Perk("profit"))*(s.branch==2?1.8:1)));
        foreach(var p in people){if(!p.InLine || !p.AtMouth(Radius))continue;if(shown>=Math.Min(capacity,8))break;
            bool fling=shown==0&&s.speed>Top*.58f&&Mathf.FloorToInt(s.angle/arcForCombo())%3!=0&&p.role!="Géant"&&p.role!="Chargement"&&p.role!="Robot";
            p.Board(fling,Radius,s.angle,bladeCounts[Blade],seatBends[Blade],s.speed);shown++;
            if(fling){bounced=1;s.combo++;s.comboClock=2.1f+.3f*Perk("breath");Tell("Éjection ×"+s.combo);continue;}
            switch(p.role){case "Coursier":bonus+=12*fare;break;case "Robot":s.repair=18;break;case "Défilé":s.festival=18;break;case "Guide":s.waiting+=2*Wave;break;case "Idole":s.rush=14;break;case "VIP":bonus+=fare*2*(1+.5*Perk("vip"));break;case "Voyageur":bonus+=fare*.5;break;case "Géant":case "Chargement":bonus+=fare*30;break;}
        }
        double group=Math.Min(bulk,capacity-shown);
        crowd.BoardGroup(group,Radius,s.angle,bladeCounts[Blade],seatBends[Blade]);
        double paid=shown-bounced+group;minuteAdmissions[rateSecond%60]+=paid;perMinute+=paid;s.waiting-=paid;s.admitted+=paid;s.departures+=paid;
        if(paid>0){lastIncome=Math.Floor(fare*paid*(s.festival>0?2:1)*(manual?1+.2*Perk("crank"):1)*(1+.01*Math.Min(50,s.combo)*(1+.1*Perk("fling")))+bonus);
            s.cash+=lastIncome;s.earned+=lastIncome;BuildDock();
            AddPulse(door.position + new Vector3(.25f, .68f, Radius * .64f), "+"+Num(lastIncome));
            Sound(1.2f);}
    }
    void PlaceBalloon(){balloon.position=new Vector3(-3.4f+.1f*s.balloonAge,1.7f+.12f*Mathf.Sin(s.balloonAge*2),.3f);}
    void HideBalloon(){s.balloonAge=-1;balloon.gameObject.SetActive(false);}
    void Pop(){HideBalloon();s.cash+=6*Math.Pow(1.7,L(6));s.rush=12;Arrive(Wave*4);Tell("Ballon éclaté · affluence pendant 12 s");Sound(1.6f);}
    double Price(int i)=>Math.Ceiling(rules.upgrades[i].cost*Math.Pow(rules.upgrades[i].factor,L(i))*(i==0&&s.contracts[1]?Math.Max(.5,1-.1*L(1)):1));
    int LevelLimit(int i)=>i==5?4:i==1?10:i==7?4+2*s.runs:80;
    bool CanBuy(int i)=>L(i)<LevelLimit(i)&&s.cash>=Price(i);
    void Buy(int i){if(!CanBuy(i))return;s.cash-=Price(i);s.levels[i]++;
        if(i==5)s.part=Mathf.Repeat(s.angle,arcForCombo());
        lastBought=i;purchaseAt=s.seconds;if(i==0)Arrive(Wave*3);if(i==4&&s.contracts[0])s.rush=60;RefreshScene();Sound(1.5f);}
    void ClearPeople(){foreach(var p in people){p.gameObject.SetActive(false);pool.Push(p);}people.Clear();}
    void ResetGame(bool prestige){
        var old=s;ClearPeople();s=new Run();s.muted=old.muted;
        if(prestige){s.perks=old.perks;s.contracts=old.contracts;s.energy=old.energy+Math.Floor(Math.Sqrt(old.admitted/250)*(1+.1*Perk("royalty")));
            s.runs=old.runs+1;s.allTime=old.allTime+old.admitted;s.branch=old.branch;s.trust=old.trust;
            if(old.admitted>=rules.goal){s.branch=(old.branch+1)%4;s.trust+=3;}
            s.levels[0]=Perk("regulars");s.levels[1]=Perk("gearbox");s.levels[2]=Perk("warehouse");s.levels[3]=Perk("spare");s.cash=70*Math.Pow(Perk("initial"),2.7);}
        crowd.RestoreGroups(null);lastBought=-1;drag=false;ClearMeter();lastIncome=0;guestTimer=0;vehicle.gameObject.SetActive(false);panel="";RefreshScene();Save(AutoKey);
    }
    void Save(string key){s.batches=crowd.CaptureGroups();s.actors=people.ConvertAll(p=>p.Capture()).ToArray();PlayerPrefs.SetString(key,JsonUtility.ToJson(s));PlayerPrefs.Save();}
    bool Load(string key){
        if(!PlayerPrefs.HasKey(key))return false;
        Run next;try{next=JsonUtility.FromJson<Run>(PlayerPrefs.GetString(key));}catch(ArgumentException){return false;}
        if(next==null||next.levels?.Length!=9||next.perks?.Length!=rules.perks.Length||next.routes?.Length!=3||next.routeClocks?.Length!=3||next.contracts?.Length!=3)return false;
        if(next.branch<0 || next.branch>=branches.Length || double.IsNaN(next.seconds) || next.seconds<0 || next.seconds>int.MaxValue-120)return false;
        ClearPeople();s=next;ClearMeter();s.zoom=Mathf.Clamp(s.zoom,.01f,1.5f);
        if(!Mathf.Approximately(s.zoom,1))s.manualZoom=true;
        s.part=Mathf.Repeat(s.part,arcForCombo());
        if(s.actors!=null)foreach(var r in s.actors){if(people.Count>=rules.individualLimit)break;if(r==null)continue;var p=Make();p.Restore(r);people.Add(p);}
        s.waiting=Math.Max(s.waiting,ReservedVisitorCount());
        crowd.RestoreGroups(s.batches);
        vehicle.gameObject.SetActive(false);
        if(balloon && s.balloonAge>=0)PlaceBalloon();
        drag=false;lastBought=-1;
        RefreshScene();return true;
    }
    void OnApplicationFocus(bool focus){if(!focus)drag=false;}
    void OnApplicationPause(bool pause){if(pause&&rules)Save(AutoKey);}
    void OnApplicationQuit(){Save(AutoKey);}
}
