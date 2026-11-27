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
        if (scene.path == ScenePath)
        {
            FrameDoor();
            return;
        }
        bool starter = string.IsNullOrEmpty(scene.path) || scene.path == "Assets/Scenes/SampleScene.unity";
        if (!starter) return;
        foreach (GameObject root in scene.GetRootGameObjects())
        {
            if (root.GetComponent<Camera>() == null && root.GetComponent<Light>() == null) return;
        }
        if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) != null)
        {
            EditorSceneManager.OpenScene(ScenePath);
            EditorApplication.delayCall += FrameDoor;
        }
    }

    [MenuItem("Round and Round/Ouvrir le quartier")]
    private static void OpenQuartier()
    {
        if (!EditorApplication.isPlayingOrWillChangePlaymode &&
            EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
        {
            EditorSceneManager.OpenScene(ScenePath);
            EditorApplication.delayCall += FrameDoor;
        }
    }

    [MenuItem("Round and Round/Cadrer la porte")]
    private static void FrameDoor()
    {
        var scene = SceneManager.GetActiveScene();
        var window = SceneView.lastActiveSceneView;
        if (scene.path != ScenePath || !window) return;
        foreach (var root in scene.GetRootGameObjects())
        {
            if (!root.TryGetComponent<RoundGame>(out var game) || !game.view || !game.door) continue;
            var camera = game.view;
            var direction = camera.transform.forward;
            var offset = Vector3.Dot(game.door.position - camera.transform.position, direction);
            var focus = camera.transform.position + direction * offset;
            window.orthographic = true;
            window.showGrid = false;
            window.sceneLighting = true;
            window.LookAtDirect(focus, camera.transform.rotation, camera.orthographicSize);
            window.Repaint();
            break;
        }
    }
}
