using UnityEngine;

[CreateAssetMenu(menuName="Round and Round/Règles")]
public sealed class Rules : ScriptableObject
{
    [System.Serializable] public class Upgrade { public string id,title; public double cost,factor; }
    [System.Serializable] public class Perk { public string id,title,description; public int cost,limit; }
    public Upgrade[] upgrades;
    public Perk[] perks;
    public double goal=8200000000;
    public float initialRadius=2.35f;
    [Range(8,180)] public int individualLimit=80;
}
