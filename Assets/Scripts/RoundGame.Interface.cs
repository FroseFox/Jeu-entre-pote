using System;
using System.Globalization;
using UnityEngine;

public sealed partial class RoundGame
{
    Vector2 scroll;
    int slot;
    string saveName = "Ma partie";
    static readonly CultureInfo French = CultureInfo.GetCultureInfo("fr-FR");
    Texture2D symbols, counterBackdrop;
    GUIStyle type, dialogButton, dialogLabel, dialogField;
    Texture2D buttonPaper, buttonHover;
    static readonly Color Ink = new Color(.055f, .055f, .055f);
    static readonly Color Grey = new Color(.38f, .38f, .38f);
    bool darkPaper;
    float paperWhite=1;
    int lastBought=-1;
    double purchaseAt;
    readonly int[] dockIds=new int[9];
    int DockCount {get;set;}
    void BuildDock()
    {
        DockCount=0;
        int early=L(0)+L(1);
        for(int i=0;i<dockIds.Length;i++) {
            bool unlocked=i<2 || L(i)>0;
            switch(i) {
                case 2: unlocked|=early>=2 || s.admitted>=20;break;
                case 3: unlocked|=early>=3 || s.admitted>=35;break;
                case 4: unlocked|=early>=4 || s.admitted>=50;break;
                case 5: unlocked|=L(4)>0 || s.admitted>=80;break;
                case 6: unlocked|=s.admitted>=100;break;
                case 7: unlocked|=early>=1 || s.admitted>=12;break;
                case 8: unlocked|=s.admitted>=500;break;
            }
            if(unlocked)dockIds[DockCount++]=i;
        }
    }
    Color Tone(Color value)
    {
        float light=(darkPaper?1-value.r:value.r)*paperWhite;
        return new Color(light,light,light,value.a);
    }
    void ReadAppearance()
    {
        darkPaper=PlayerPrefs.GetInt("RoundAndRound.Dark",0)!=0;
        paperWhite=Mathf.Clamp(PlayerPrefs.GetFloat("RoundAndRound.Paper",1),.55f,1);
        ApplyAppearance();
    }
    void ApplyAppearance()
    {
        Shader.SetGlobalFloat("_RRDark",darkPaper?1:0);
        Shader.SetGlobalFloat("_RRPaperDim",1-paperWhite);
        view.backgroundColor=Tone(Color.white);
        if(dialogButton!=null) StylePaper();
    }
    void StylePaper()
    {
        dialogLabel.normal.textColor=Tone(Ink);
        foreach(var style in new[]{dialogButton,dialogField})
        foreach(var state in new[]{style.normal,style.focused,style.hover,style.active}) {
            state.textColor=Tone(Ink);
            state.background=state==style.hover || state==style.active ? buttonHover : buttonPaper;
        }
        PaintButton(buttonPaper,.97f);
        PaintButton(buttonHover,.88f);
    }
    static string Num(double n) => n >= 1e9 ? (n/1e9).ToString("0.##",French)+" Md" : n >= 1e6 ? (n/1e6).ToString("0.##",French)+" M" : Math.Floor(n).ToString("N0",French);
    static string PriceLabel(double n) => n >= 10000 && n < 1e6 ? (n/1000).ToString("0.#", French)+" k" : Num(n);
    Rect UiFrame {
        get {
            var frame=Screen.safeArea;
            return frame.width>0 && frame.height>0 ? frame : new Rect(0,0,Screen.width,Screen.height);
        }
    }
    float UiScale => Mathf.Max(.15f, Mathf.Min(UiFrame.height/650f,UiFrame.width/515f));
    Vector2 CanvasPoint(Vector3 screen) => new Vector2(screen.x-UiFrame.xMin,UiFrame.yMax-screen.y)/UiScale;
    bool ShowReopen => s.admitted >= 1000;
    void Open(string target) { panel=target; scroll=Vector2.zero; drag=false; }

    Rect Dock(float w, float h)
    {
        float width = Mathf.Min(w-18, (DockCount + (ShowReopen ? 1 : 0)) * 60 + 22);
        return new Rect((w-width)/2, h-99, width, 85);
    }
    bool StreetInput(Vector3 mouse)
    {
        float w=UiFrame.width/UiScale,h=UiFrame.height/UiScale;
        var point=CanvasPoint(mouse);
        return !Dock(w,h).Contains(point) && !new Rect(8,8,54,54).Contains(point);
    }
    void PrepareDrawing()
    {
        if (type != null) return;
        counterBackdrop = new Texture2D(40,32,TextureFormat.RGBA32,false) {hideFlags=HideFlags.HideAndDontSave,wrapMode=TextureWrapMode.Clamp};
        for(int y=0;y<32;y++)for(int x=0;x<40;x++) {
            float opacity=Mathf.SmoothStep(0,1,x/15f)*Mathf.SmoothStep(0,1,y/12f);
            counterBackdrop.SetPixel(x,y,new Color(1,1,1,.93f*opacity));
        }
        counterBackdrop.Apply();
        symbols = Resources.Load<Texture2D>("Symboles");
        type = new GUIStyle(GUI.skin.label) { padding = new RectOffset(), margin = new RectOffset(), clipping = TextClipping.Clip };
        dialogLabel = new GUIStyle(GUI.skin.label) {fontSize=16, wordWrap=true, padding=new RectOffset(5,5,5,5)};
        dialogLabel.normal.textColor = Ink;
        buttonPaper = ButtonTexture();
        buttonHover = ButtonTexture();
        dialogButton = new GUIStyle(GUI.skin.button) {
            fontSize=15, padding=new RectOffset(11,11,7,7), margin=new RectOffset(3,3,3,3),
            border=new RectOffset(7,7,7,7), wordWrap=true
        };
        dialogField = new GUIStyle(dialogButton) {alignment=TextAnchor.MiddleLeft, fontStyle=FontStyle.Normal};
        StylePaper();
    }
    Texture2D ButtonTexture()
    {
        return new Texture2D(16,16,TextureFormat.RGBA32,false) {hideFlags=HideFlags.HideAndDontSave,wrapMode=TextureWrapMode.Clamp};
    }
    void PaintButton(Texture2D tex,float fill)
    {
        const int side = 16;
        for (int y=0;y<side;y++) for (int x=0;x<side;x++) {
            float dx=Mathf.Max(0,Mathf.Abs(x-7.5f)-3.5f), dy=Mathf.Max(0,Mathf.Abs(y-7.5f)-3.5f);
            float d=Mathf.Sqrt(dx*dx+dy*dy);
            float c=Mathf.Lerp(.30f,fill,Mathf.Clamp01(4-d));
            tex.SetPixel(x,y,Tone(new Color(c,c,c,Mathf.Clamp01(5-d))));
        }
        tex.Apply();
    }
    void OnDestroy()
    {
        Shader.SetGlobalFloat("_RRDark",0);
        Shader.SetGlobalFloat("_RRPaperDim",0);
        if (counterBackdrop) Destroy(counterBackdrop);
        if (buttonHover) Destroy(buttonHover);
        if (buttonPaper) Destroy(buttonPaper);
        if (tickSound) Destroy(tickSound);
    }
    void Fill(Rect r, Color color, float radius)
    {
        GUI.DrawTexture(r,Texture2D.whiteTexture,ScaleMode.StretchToFill,true,0,Tone(color),0,radius);
    }
    void Plate(Rect r, float radius, Color fill, float stroke=1.5f)
    {
        Fill(r,Ink,radius);
        Fill(new Rect(r.x+stroke,r.y+stroke,r.width-stroke*2,r.height-stroke*2),fill,Mathf.Max(0,radius-stroke));
    }
    void Text(Rect r,string value,int size,Color color,TextAnchor anchor=TextAnchor.MiddleCenter,bool bold=false)
    {
        type.fontSize=size;type.alignment=anchor;type.fontStyle=bold?FontStyle.Bold:FontStyle.Normal;type.normal.textColor=Tone(color);
        GUI.Label(r,value,type);
    }
    void Symbol(Rect r,int id,Color color)
    {
        if (!symbols) return;
        var previous=GUI.color; GUI.color=previous*Tone(color);
        GUI.DrawTextureWithTexCoords(r,symbols,new Rect((id%4)*.25f,(3-id/4)*.25f,.25f,.25f));
        GUI.color=previous;
    }
    void DrawCounters(float w)
    {
        var previous=GUI.color;
        GUI.color=Tone(Color.white);
        GUI.DrawTexture(new Rect(w-323,0,323,s.rush>0 || s.festival>0 || s.repair>0?175:153),counterBackdrop);
        GUI.color=previous;
        float right = w-24;
        string cash=Num(s.cash);
        type.fontSize=30;type.fontStyle=FontStyle.Bold;
        float amountWidth=type.CalcSize(new GUIContent(cash)).x+3;
        Symbol(new Rect(right-amountWidth-28,22,25,25),12,Ink);
        Text(new Rect(right-amountWidth,12,amountWidth,43),cash,30,Ink,TextAnchor.MiddleRight,true);
        Text(new Rect(right-240,55,240,24),Num(perMinute)+" / min",16,Ink,TextAnchor.MiddleRight);
        Text(new Rect(right-284,86,284,17),"Entrées dans cette partie  "+Num(s.admitted),12,Grey,TextAnchor.MiddleRight);
        double percent=100*s.admitted/rules.goal;
        Text(new Rect(right-284,104,284,17),percent.ToString("0.########",French)+" % de l’humanité",12,Grey,TextAnchor.MiddleRight);
        if (s.rush>0 || s.festival>0 || s.repair>0) {
            string message=s.rush>0?"Affluence  "+Mathf.CeilToInt(s.rush)+" s":s.festival>0?"Festival  "+Mathf.CeilToInt(s.festival)+" s":"Réparation  "+Mathf.CeilToInt(s.repair)+" s";
            Text(new Rect(right-200,126,200,20),message,13,Ink,TextAnchor.MiddleRight,true);
        }
    }
    void DrawDock(float w,float h)
    {
        var dock=Dock(w,h);
        Plate(dock,16,Color.white,1.8f);
        int count=DockCount, slots=count+(ShowReopen?1:0);
        float step=(dock.width-16)/slots;
        string hint=null;
        for(int k=0;k<slots;k++)
        {
            bool reopen=ShowReopen && k==4;
            int index=ShowReopen && k>4?k-1:k;
            int i=reopen?0:dockIds[index];
            float center=dock.x+8+(k+.5f)*step;
            Rect hit=new Rect(center-step*.5f,dock.y+2,step,dock.height-4);
            bool hover=hit.Contains(Event.current.mousePosition);
            float d=Mathf.Min(step-6,reopen?58:47);
            Rect circle=new Rect(center-d/2,dock.y+11+(47-d)/2,d,d);
            bool affordable=reopen || CanBuy(i);
            Plate(circle, d/2, affordable ? Ink : Color.white);
            Rect icon=new Rect(circle.x+d*.15f,circle.y+d*.15f,d*.70f,d*.70f);
            Symbol(icon,reopen?9:i,affordable?Color.white:Ink);
            if(!reopen) {
                var key=new Rect(circle.x-2,circle.yMax-11,14,14);
                Plate(key,7,Color.white,1);
                Text(key,(index+1).ToString(),9,Ink);
            }
            string price=reopen ? "+"+Num(Math.Sqrt(s.admitted/250)) : L(i)>=LevelLimit(i)?"MAX":PriceLabel(Price(i));
            var priceRect=new Rect(center-step/2,dock.y+61,step,18);
            Text(priceRect,(reopen?"": "● ")+price,12,affordable?Ink:Grey,TextAnchor.MiddleCenter,affordable);
            if (!reopen && i==lastBought && s.seconds-purchaseAt<.72) {
                float t=(float)((s.seconds-purchaseAt)/.72);
                var centerPoint=circle.center;
                for(int j=0;j<8;j++) {
                    float a=(j+.25f)*Mathf.PI/4;
                    float spread=d*(.55f+t*.38f),spark=4*(1-t)+1;
                    var dot=centerPoint+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*spread;
                    Fill(new Rect(dot.x,dot.y,spark,spark),Ink,spark/2);
                }
                Badge(new Vector2(center, dock.y-20-t*16),"Niv. "+L(i),false);
            }
            if (hover && (i!=lastBought || s.seconds-purchaseAt>=.72)) hint=reopen?"Réouverture de l’agence":rules.upgrades[i].title+"   ·   niveau "+L(i);
            if (GUI.Button(hit,GUIContent.none,GUIStyle.none)) {
                if (reopen) Open("Agence");
                else if (affordable) Buy(i);
                else Tell(rules.upgrades[i].title+" · "+(L(i)>=LevelLimit(i)?"niveau maximum":Num(Price(i))+" crédits"));
            }
        }
        if (hint==null && s.seconds<14 && s.angle==0 && s.speed==0) hint="Cliquez sur la place pour tourner";
        if(hint!=null) Badge(new Vector2(w/2,dock.y-20),hint,false);
    }
    void Badge(Vector2 center,string message,bool dark)
    {
        type.fontSize=dark?19:14;type.fontStyle=FontStyle.Bold;
        float width=type.CalcSize(new GUIContent(message)).x+21;
        width=Mathf.Min(width,UiFrame.width/UiScale-8);
        Rect r=new Rect(Mathf.Clamp(center.x-width/2,4,UiFrame.width/UiScale-width-4),Mathf.Clamp(center.y-15,4,UiFrame.height/UiScale-34),width,30);
        Plate(r,8,dark?Ink:Color.white);
        Text(r,message,dark?19:14,dark?Color.white:Ink,TextAnchor.MiddleCenter,true);
    }
    struct Pulse
    {
        public Vector3 position;
        public double start;
        public bool active;
        public string income;
    }
    readonly Pulse[] pulses = new Pulse[14];
    int nextPulse;
    void AddPulse(Vector3 position,string income)
    {
        pulses[nextPulse]=new Pulse {active=true, position=position, start=s.seconds, income=income};
        nextPulse=(nextPulse+1)%pulses.Length;
    }
    void DrawPulses(float h)
    {
        var old=GUI.color;
        for(int i=0;i<pulses.Length;i++) {
            var pulse=pulses[i];
            if(!pulse.active) continue;
            float age=(float)(s.seconds-pulse.start);
            float t=age/(pulse.income==null?.48f:.95f);
            if(t<0 || t>=1) {pulses[i].active=false;continue;}
            var screen=view.WorldToScreenPoint(pulse.position);
            if(screen.z<=0) continue;
            var center=CanvasPoint(screen);
            GUI.color=new Color(1,1,1,Mathf.Clamp01((1-t)*3));
            if(pulse.income!=null) {
                var drift=new Vector2(Mathf.Sin(i*2.4f)*22*t,-18-40*t);
                Badge(center+drift,pulse.income,false);
            } else {
                float radius=5+25*Mathf.Sqrt(t);
                for(int j=0;j<8;j++) {
                    float a=j*Mathf.PI/4+i;
                    Vector2 point=center+new Vector2(Mathf.Cos(a)*radius,Mathf.Sin(a)*radius*.65f);
                    float size=4*(1-t)+1;
                    Fill(new Rect(point.x-size/2,point.y-size/2,size,size),Ink,size*.4f);
                }
            }
        }
        GUI.color=old;
    }
    void DrawFeedback(float w,float h)
    {
        DrawPulses(h);
        var anchor=view.WorldToScreenPoint(door.position+Vector3.up*.7f);
        var point=CanvasPoint(anchor);
        if (s.comboClock>0 && s.combo>0) Badge(new Vector2(point.x,Mathf.Max(63,point.y-113)), "Éjection × "+Num(s.combo),true);
        if (noticeClock>0 && !notice.StartsWith("Éjection",StringComparison.Ordinal))
            Badge(new Vector2(point.x,Mathf.Max(98,point.y-62-(2.1f-noticeClock)*12)),notice,false);
    }
    bool Button(string text,bool enabled=true)
    {
        Color old=GUI.color;
        if (!enabled) GUI.color=new Color(.65f,.65f,.65f,.8f);
        bool previous=GUI.enabled; GUI.enabled=previous&&enabled;
        bool pressed=GUILayout.Button(text,dialogButton,GUILayout.MinHeight(32));
        GUI.enabled=previous;GUI.color=old;
        return pressed;
    }
    void Label(string text) => GUILayout.Label(text,dialogLabel);
    void OnGUI()
    {
        PrepareDrawing();
        var before=GUI.matrix;
        var frame=UiFrame;
        float scale=UiScale,w=frame.width/scale,h=frame.height/scale;
        GUI.matrix=Matrix4x4.TRS(new Vector3(frame.xMin,Screen.height-frame.yMax,0),Quaternion.identity,new Vector3(scale,scale,1));
        DrawCounters(w);
        var pause=new Rect(20,19,34,34);
        Plate(pause,17,Color.white);
        Symbol(new Rect(pause.x+6,pause.y+6,22,22),s.paused?11:10,Ink);
        if(panel=="") {
            if(GUI.Button(new Rect(8,8,56,56),GUIContent.none,GUIStyle.none)) {
                if(s.paused)s.paused=false;else Open("Pause");
            }
            DrawFeedback(w,h);
            DrawDock(w,h);
        }
        if(panel!="") DrawPanel(w,h);
        GUI.matrix=before;
    }
    void DrawPanel(float w,float h)
    {
        Fill(new Rect(0,0,w,h),new Color(1,1,1,.87f),0);
        float width=Mathf.Min(575,w-30),height=Mathf.Min(495,h-32);
        var r=new Rect((w-width)/2,(h-height)/2,width,height);
        Plate(r,12,Color.white,2);
        GUILayout.BeginArea(new Rect(r.x+16,r.y+12,width-32,height-24));
        GUILayout.BeginHorizontal();
        Label(panel);GUILayout.FlexibleSpace();
        if (Button("Fermer")) {panel="";s.paused=false;}
        GUILayout.EndHorizontal();
        scroll=GUILayout.BeginScrollView(scroll);
        switch(panel){
        case "Pause":
            if(Button("Reprendre")) {panel="";s.paused=false;}
            if(Button("Atelier")) Open("Atelier");
            if(Button("Agence")) Open("Agence");
            if(Button("Parties locales")) Open("Parties locales");
            if(Button("Options")) Open("Options");
            GUILayout.BeginHorizontal();
            if(Button("−"))Zoom(.8f);
            if(Button("Vue  "+Mathf.RoundToInt(s.zoom*100)+" %")) {s.zoom=1;s.manualZoom=false;FrameCamera();}
            if(Button("+"))Zoom(1.25f);
            GUILayout.EndHorizontal();
            Label("Cliquez sur la place ou maintenez Espace pour faire tourner la porte.");
            break;
        case "Atelier":
            Label(Num(s.cash)+" crédits disponibles");
            for(int i=0;i<rules.upgrades.Length;i++)if(Button(rules.upgrades[i].title+"   ·   niv. "+L(i)+"   ·   "+Num(Price(i))+" crédits",CanBuy(i)))Buy(i);
            if(Button("Lignes de transport"))Open("Transports");break;
        case "Transports":
            for(int i=0;i<3;i++){
                int required=i==0&&s.contracts[2]?1:3*(i+1);double price=Math.Ceiling((i==0?110:i==1?480:1600)*Math.Pow(1.78,s.routes[i]));
                if(Button((i==0?"Bus":i==1?"Train":"Avion")+"   ·   niv. "+s.routes[i]+"   ·   "+Num(price)+" crédits · publicité "+required,L(0)>=required&&s.cash>=price&&s.routes[i]<80)){
                    s.cash-=price;s.routes[i]++;Save(AutoKey);}
            }break;
        case "Agence":
            Label("Agence "+(s.runs+1)+" · "+branches[s.branch]+" · "+Num(s.energy)+" énergie");
            if(Button("Avantages permanents"))Open("Avantages");
            if(Button("Réouverture · "+Num(Math.Sqrt(s.admitted/250))+" énergie",s.admitted>=1000))Open("Confirmer la réouverture");
            if(Button("Tirage · "+s.tickets+" tickets",s.tickets>0&&Perk("draw")>0)){
                s.tickets--;double prize=Math.Max(6,s.earned/Math.Max(1,s.seconds)*60)*UnityEngine.Random.Range(1,9);s.cash+=Math.Floor(prize);Save(AutoKey);panel="";Tell("Prix · "+Num(prize)+" crédits");}
            string[] contracts={"Inauguration","Guilde des engrenages","Partenaire des bus"};
            for(int i=0;i<3;i++)if(Button(contracts[i]+(s.contracts[i]?" · signé":" · 1 confiance"),!s.contracts[i]&&s.trust>=1)){s.contracts[i]=true;s.trust--;Save(AutoKey);}
            break;
        case "Avantages":
            for(int i=0;i<rules.perks.Length;i++){
                var perk=rules.perks[i];int cost=perk.cost*(1+s.perks[i]);
                if(Button(perk.title+"   ·   "+s.perks[i]+"/"+perk.limit+"   ·   "+cost+" énergie",s.energy>=cost&&s.perks[i]<perk.limit)){
                    s.energy-=cost;s.perks[i]++;if(perk.id=="draw")s.tickets=Math.Min(3,s.tickets+1);Save(AutoKey);}
            }break;
        case "Confirmer la réouverture":
            Label("Repartir avec vos avantages permanents et votre énergie ?");
            if(Button("Rouvrir l’agence"))ResetGame(true);break;
        case "Options":
            if(Button(s.muted?"Activer le son":"Couper le son")){s.muted=!s.muted;Sound(1);}
            if(Button(darkPaper?"Thème sombre":"Thème clair")) {
                darkPaper=!darkPaper;
                PlayerPrefs.SetInt("RoundAndRound.Dark",darkPaper?1:0);
                ApplyAppearance();
            }
            Label("Luminosité du blanc  "+Mathf.RoundToInt(paperWhite*100)+" %");
            float brightness=GUILayout.HorizontalSlider(paperWhite,.55f,1);
            if(Event.current.type!=EventType.Layout && Mathf.Abs(brightness-paperWhite)>.001f) {
                paperWhite=brightness;
                PlayerPrefs.SetFloat("RoundAndRound.Paper",paperWhite);
                ApplyAppearance();
            }
            Label("Foule dans la rue");
            foreach(int n in new[]{0,2000,50000,250000,1000000,2000000})if(Button((s.crowdSize==n?"✓  ":"")+(n==0?"Selon l’affluence":Num(n)+" passants"))){s.crowdSize=n;RefreshScene();Save(AutoKey);}
            if(Button("Nouvelle partie"))Open("Recommencer");break;
        case "Recommencer":
            Label("Remettre la rue, les crédits et les améliorations à zéro ? Les copies locales sont conservées.");
            if(Button("Effacer la partie en cours"))ResetGame(false);break;
        case "Parties locales":
            Label("La partie en cours se sauvegarde automatiquement.");
            saveName=GUILayout.TextField(saveName,48,dialogField);
            for(int i=0;i<4;i++){
                string key=SlotKey(i);GUILayout.BeginHorizontal();Label(PlayerPrefs.GetString(key+".nom","Emplacement "+(i+1)));
                if(Button("Enregistrer")){slot=i;if(PlayerPrefs.HasKey(key))Open("Remplacer la copie");else WriteSlot();}
                if(Button("Charger",PlayerPrefs.HasKey(key))){slot=i;Open("Charger la copie");}GUILayout.EndHorizontal();
            }break;
        case "Remplacer la copie":if(Button("Remplacer la sauvegarde "+(slot+1)))WriteSlot();break;
        case "Charger la copie":if(Button("Reprendre cette partie")){if(Load(SlotKey(slot))){Save(AutoKey);panel="";}}break;
        }
        GUILayout.EndScrollView();GUILayout.EndArea();
    }
    string SlotKey(int i)=>AutoKey+".Slot"+i;
    void WriteSlot(){string key=SlotKey(slot);PlayerPrefs.SetString(key+".nom",string.IsNullOrWhiteSpace(saveName)?"Partie "+(slot+1):saveName);Save(key);Open("Parties locales");}
}
