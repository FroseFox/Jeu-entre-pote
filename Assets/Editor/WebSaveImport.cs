using System;
using System.IO;
using System.Reflection;
using UnityEditor;
using UnityEngine;

internal static class WebSaveImport
{
    [Serializable] private sealed class Table
    {
#pragma warning disable 0649
        public int promo,gear,fly,motor,expand,blade,fee,group,route,bus,train,air;
        public int gulp,drone,draw,fling,breath,flyMaster,license,routes,vip,delivery,giant,regulars,gearbox,spare,warehouse,initial,crank,royalty,admin,force,profit,capacity;
        public int Read(string key) => (int)typeof(Table).GetField(key,BindingFlags.Instance|BindingFlags.Public).GetValue(this);
    }
    [Serializable] private sealed class State
    {
        public double cash,admitted,earned,energy,trust,allTime,seconds;
        public int runs,tickets;
        public string branch;
        public string[] contracts,disabledContracts;
        public Table levels,perks,routeLv;
    }
    [Serializable] private sealed class Options {public bool sound;public float zoom=1;public int streetSize;}
    [Serializable] private sealed class Web {public int version; public State state; public Options options; public double waiting; public float angle,turnPart; public bool paused;}
#pragma warning restore 0649
    [MenuItem("Round and Round/Importer une partie web dans un emplacement…")]
    static void Import()
    {
        var path=EditorUtility.OpenFilePanel("Choisir une sauvegarde web JSON","","json");
        if(string.IsNullOrEmpty(path))return;
        try {
            var web=JsonUtility.FromJson<Web>(File.ReadAllText(path));var w=web.state;
            if((web.version!=1&&web.version!=2)||w?.levels==null||w.cash<0||w.admitted<0)throw new FormatException("Format de sauvegarde inconnu.");
            var rules=AssetDatabase.LoadAssetAtPath<Rules>("Assets/Rules.asset");
            var n=new RoundGame.Run {cash=w.cash,admitted=w.admitted,earned=w.earned,energy=w.energy,
                seconds=w.seconds,trust=w.trust,allTime=w.allTime,runs=w.runs,tickets=w.tickets,
                waiting=Math.Max(0,web.waiting),angle=web.angle,part=web.turnPart,paused=web.paused,
                branch=Math.Max(0,Array.IndexOf(new[]{"main","seaside","luxury","airport"},w.branch))};
            for(int i=0;i<rules.upgrades.Length;i++)n.levels[i]=Mathf.Clamp(w.levels.Read(rules.upgrades[i].id),0,80);
            for(int i=0;i<rules.perks.Length;i++)n.perks[i]=Mathf.Clamp(w.perks?.Read(rules.perks[i].id)??0,0,rules.perks[i].limit);
            for(int i=0;i<3;i++){
                n.routes[i]=Mathf.Clamp(w.routeLv?.Read(new[]{"bus","train","air"}[i])??Math.Max(0,w.levels.route-(i==0?0:i==1?1:3)),0,80);
                string id=new[]{"expandParty","guild","busPartner"}[i];
                n.contracts[i]=Array.IndexOf(w.contracts??Array.Empty<string>(),id)>=0&&Array.IndexOf(w.disabledContracts??Array.Empty<string>(),id)<0;
            }
            if(web.options!=null){n.zoom=Mathf.Clamp(web.options.zoom,.01f,1.5f);n.crowdSize=Mathf.Clamp(web.options.streetSize,0,2000000);n.muted=!web.options.sound;}
            const string key="RoundAndRound.Native.Current.v1.Slot3";
            if(PlayerPrefs.HasKey(key)&&!EditorUtility.DisplayDialog("Remplacer la quatrième copie ?",PlayerPrefs.GetString(key+".nom"),"Remplacer","Annuler"))return;
            PlayerPrefs.SetString(key,JsonUtility.ToJson(n));PlayerPrefs.SetString(key+".nom","Import web");PlayerPrefs.Save();
            EditorUtility.DisplayDialog("Import terminé","Dans la scène Quartier, lancez Play puis ouvrez Parties et chargez « Import web ».","OK");
        }catch(Exception e){EditorUtility.DisplayDialog("Import impossible",e.Message,"OK");}
    }
}
