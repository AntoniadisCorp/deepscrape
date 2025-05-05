import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_DEPLOY4SCRAP } from '../variables';
import { catchError } from 'rxjs/internal/operators/catchError';
import { tap } from 'rxjs/internal/operators/tap';
import { DockerImageInfo } from '../types';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs/internal/observable/of';
import { handleError } from '../functions';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeploymentService {

  constructor(private http: HttpClient, private authService: AuthService) { }


  /**
   * The function `checkImageDeployability` sends a request to an API endpoint to check the
   * deployability of a Docker image and returns an Observable with the response.
   * @param {string} imageName - The `imageName` parameter is a string that represents the name of the
   * Docker image that you want to check for deployability. This function `checkImageDeployability`
   * sends a request to an API endpoint with the provided image name to determine if the image exists
   * and retrieve additional information about it.
   * @returns The `checkImageDeployability` function returns an Observable that emits an object with
   * two properties: `exists` of type boolean and `info` of type `DockerImageInfo`. The Observable
   * makes an HTTP GET request to a specified API endpoint to check the deployability of a given image
   * name. The response from the API call is logged to the console if successful, and any errors
   * encountered during the
   */
  checkImageDeployability(imageName: string): Observable<{ exists: boolean; info: DockerImageInfo }> {
    const url = `${API_DEPLOY4SCRAP}/check-image` // Replace with your API endpoint
    const headers = {
      'Authorization': `Bearer ${this.authService.token}`
    }
    const params = new HttpParams().set('name', encodeURIComponent(imageName))

    return this.http.get<{ exists: boolean; info: DockerImageInfo }>(url, { headers, params }).pipe(
      tap((response: any) => {
        console.log('Image deployability check successful:', response)
      }),
      map((response: any) => response.data),
      catchError(handleError)
    )
  }

  /**
   * The function `createMachine` sends a POST request to an API endpoint with deployment data, setting
   * headers and parameters, and handling the response and errors.
   * @param {FormData} deploymentData - The `deploymentData` parameter in the `createMachine` function
   * is of type `FormData`, which is typically used to send data in key-value pairs via HTTP requests.
   * In this context, it likely contains the data needed for deploying a machine or making a
   * deployment-related API call. The function sets headers
   * @returns The `createMachine` function is returning an Observable from an HTTP POST request to the
   * specified API endpoint (`API_DEPLOY4SCRAP/deploy`). The function sets headers with an
   * authorization token, sets parameters including the region and clone values, and then makes the
   * POST request with the deployment data, headers, and parameters.
   */
  createMachine(deploymentData: FormData) {

    // set headers
    const headers = {
      'Authorization': `Bearer ${this.authService.token}`
    }
    const region: string = deploymentData.get('region')?.valueOf() as string

    // set params
    const params: HttpParams = new HttpParams()
    params.set('region', region)
    params.set('clone', 'false')

    const url = `${API_DEPLOY4SCRAP}/deploy` // Replace with your API endpoint

    return this.http.post(url, deploymentData, { headers, params }).pipe(

      tap((response: any) => {

        console.log('Deployment successful:', response)
      }),
      catchError(error => {
        console.error('Error in Jina AI API call:', error)
        throw error
      })

    )
  }

}
