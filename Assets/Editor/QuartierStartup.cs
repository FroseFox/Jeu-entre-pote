using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

internal static class QuartierStartup
{
    private const string ScenePath = "Assets/Scenes/Quartier.unity";
    private const string Checked = "RoundAndRound.CheckedStartupScene";

    [InitializeOnLoadMethod]
    private static void Schedule()
    {
        EditorApplication.delayCall += CheckStartup;
    }

    private static void CheckStartup()
    {
        if (Application.isBatchMode || SessionState.GetBool(Checked, false) ||
            EditorApplication.isPlayingOrWillChangePlaymode) return;
        if (EditorApplication.isCompiling || EditorApplication.isUpdating)
        {
            EditorApplication.delayCall += CheckStartup;
            return;
        }
        Scene scene = SceneManager.GetActiveScene();
        if (!scene.IsValid() || !scene.isLoaded)
        {
            EditorApplication.delayCall += CheckStartup;
            return;
        }
        SessionState.SetBool(Checked, true);
        if (SceneManager.sceneCount != 1 || scene.isDirty) return;
        bool starter = string.IsNullOrEmpty(scene.path) || scene.path == "Assets/Scenes/SampleScene.unity";
        if (!starter) return;
        foreach (GameObject root in scene.GetRootGameObjects())
        {
            if (root.GetComponent<Camera>() == null && root.GetComponent<Light>() == null) return;
        }
        if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) != null)
            EditorSceneManager.OpenScene(ScenePath);
    }

    [MenuItem("Round and Round/Ouvrir le quartier")]
    private static void OpenQuartier()
    {
        if (!EditorApplication.isPlayingOrWillChangePlaymode &&
            EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
            EditorSceneManager.OpenScene(ScenePath);
    }
}
