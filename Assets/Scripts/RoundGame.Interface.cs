using System;
using System.Globalization;
using UnityEngine;

public sealed partial class RoundGame
{
    Vector2 scroll;
    int slot;
    string saveName="Ma partie";
    static readonly CultureInfo French=CultureInfo.GetCultureInfo("fr-FR");
    static string Num(double n)=>n>=1e9?(n/1e9).ToString("0.#",French)+" Md":n>=1e6?(n/1e6).ToString("0.#",French)+" M":Math.Floor(n).ToString("N0",French);
    void Open(string target){panel=target;scroll=Vector2.zero;drag=false;}
    static bool Button(string text,bool enabled=true){
        bool previous=GUI.enabled;GUI.enabled=previous&&enabled;bool pressed=GUILayout.Button(text,GUILayout.MinHeight(32));GUI.enabled=previous;return pressed;
    }
    void OnGUI(){
        float scale=Mathf.Clamp(Screen.width/850f,.82f,1.65f);
        float w=Screen.width/scale,h=Screen.height/scale;
        GUI.matrix=Matrix4x4.Scale(new Vector3(scale,scale,1));
        GUILayout.BeginArea(new Rect(8,6,w-16,95),GUI.skin.box);
        GUILayout.BeginHorizontal();GUILayout.Label("<b>ROUND & ROUND INC.</b>");GUILayout.FlexibleSpace();
        if(Button(s.paused?"Reprendre":"Pause"))s.paused=!s.paused;
        if(Button("Parties"))Open("Parties locales");GUILayout.EndHorizontal();
        GUILayout.Label(branches[s.branch]+"     •     "+Num(s.cash)+" crédits     •     "+Num(s.admitted)+" entrées");
        GUILayout.EndArea();
        if(panel==""){
            if(noticeClock>0)GUI.Box(new Rect(w/2-130,103,260,28),notice);
            GUILayout.BeginArea(new Rect(8,h-102,w-16,94),GUI.skin.box);
            GUILayout.BeginHorizontal();
            if(Button("−"))Zoom(.8f);if(Button(Mathf.RoundToInt(s.zoom*100)+" %")){s.zoom=1;RefreshScene();}if(Button("+"))Zoom(1.25f);
            if(Button("Faire tourner",!s.paused))Spin();
            GUILayout.EndHorizontal();GUILayout.BeginHorizontal();
            if(Button("Atelier"))Open("Atelier");if(Button("Agence"))Open("Agence");if(Button("Options"))Open("Options");
            GUILayout.EndHorizontal();GUILayout.EndArea();return;
        }
        float width=Mathf.Min(560,w-16),height=Mathf.Min(500,h-110);
        GUILayout.BeginArea(new Rect((w-width)/2,Mathf.Max(6,(h-height)/2),width,height),GUI.skin.window);
        GUILayout.BeginHorizontal();GUILayout.Label(panel);GUILayout.FlexibleSpace();if(Button("Fermer"))panel="";GUILayout.EndHorizontal();
        scroll=GUILayout.BeginScrollView(scroll);
        switch(panel){
        case "Atelier":
            GUILayout.Label(Num(s.cash)+" crédits disponibles");
            for(int i=0;i<rules.upgrades.Length;i++)if(Button(rules.upgrades[i].title+"   ·   niv. "+L(i)+"   ·   "+Num(Price(i))+" crédits",CanBuy(i)))Buy(i);
            if(Button("Lignes de transport"))Open("Transports");break;
        case "Transports":
            for(int i=0;i<3;i++){
                int required=i==0&&s.contracts[2]?1:3*(i+1);double price=Math.Ceiling((i==0?110:i==1?480:1600)*Math.Pow(1.78,s.routes[i]));
                if(Button((i==0?"Bus":i==1?"Train":"Avion")+"   ·   niv. "+s.routes[i]+"   ·   "+Num(price)+" crédits · publicité "+required,L(0)>=required&&s.cash>=price&&s.routes[i]<80)){
                    s.cash-=price;s.routes[i]++;Save(AutoKey);}
            }break;
        case "Agence":
            GUILayout.Label("Agence "+(s.runs+1)+" · "+branches[s.branch]+" · "+Num(s.energy)+" énergie");
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
            GUILayout.Label("Repartir avec vos avantages permanents et votre énergie ?");
            if(Button("Rouvrir l’agence"))ResetGame(true);break;
        case "Options":
            if(Button(s.muted?"Activer le son":"Couper le son")){s.muted=!s.muted;Sound(1);}
            GUILayout.Label("Foule dans la rue");
            foreach(int n in new[]{0,2000,50000,250000,1000000,2000000})if(Button((s.crowdSize==n?"✓  ":"")+(n==0?"Selon l’affluence":Num(n)+" passants"))){s.crowdSize=n;RefreshScene();Save(AutoKey);}
            if(Button("Nouvelle partie"))Open("Recommencer");break;
        case "Recommencer":
            GUILayout.Label("Remettre la rue, les crédits et les améliorations à zéro ? Les copies locales sont conservées.");
            if(Button("Effacer la partie en cours"))ResetGame(false);break;
        case "Parties locales":
            GUILayout.Label("La partie en cours se sauvegarde automatiquement.");
            saveName=GUILayout.TextField(saveName,48);
            for(int i=0;i<4;i++){
                string key=SlotKey(i);GUILayout.BeginHorizontal();GUILayout.Label(PlayerPrefs.GetString(key+".nom","Emplacement "+(i+1)));
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
